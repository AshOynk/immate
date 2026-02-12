import { Router } from 'express';
import mongoose from 'mongoose';
import { Submission } from '../models/Submission.js';
import { Task } from '../models/Task.js';
import { ResidentReward } from '../models/ResidentReward.js';
import { analyzeComplianceFrames } from '../services/claude.js';
import { notifySubmissionReceived, notifyCheckTriggered } from '../services/eufy.js';
export const complianceRouter = Router();

const MAX_AGE_MS = 30 * 60 * 1000; // 30 min - recording must be recent (live-only)

// GET /api/residents - list resident IDs. Match with or without leading slash.
complianceRouter.get(['/residents', 'residents'], async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }
    const [fromSubmissions, fromRewards] = await Promise.all([
      Submission.distinct('residentId'),
      ResidentReward.distinct('residentId'),
    ]);
    const ids = [...new Set([...fromSubmissions, ...fromRewards])].filter(Boolean).sort();
    res.json(ids);
  } catch (err) {
    console.error('List residents error:', err);
    res.json([]);
  }
});

// GET /api/tasks - list tasks. Match with or without leading slash.
complianceRouter.get(['/tasks', 'tasks'], async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }
    const { active, inWindow } = req.query;
    const now = new Date();
    let filter = {};
    if (active === 'true') filter.active = true;
    if (inWindow === 'true') {
      filter.windowStart = { $lte: now };
      filter.windowEnd = { $gte: now };
    }
    const list = await Task.find(filter).sort({ windowStart: 1 }).lean();
    res.json(list);
  } catch (err) {
    console.error('List tasks error:', err);
    res.json([]);
  }
});

// POST /api/submit - live recording only; requires taskId (within task window); AI checks; notifies Eufy
complianceRouter.post('/submit', async (req, res) => {
  try {
    const { taskId, residentId, timestamp, recordedAt, videoBase64, framesBase64 } = req.body;
    if (!taskId || !residentId || !timestamp || !videoBase64) {
      return res.status(400).json({
        error: 'Missing required fields: taskId, residentId, timestamp, videoBase64',
      });
    }
    const task = await Task.findById(taskId).lean();
    if (!task) return res.status(400).json({ error: 'Task not found' });
    if (!task.active) return res.status(400).json({ error: 'Task is not active' });
    const now = new Date();
    if (now < task.windowStart) return res.status(400).json({ error: 'Task window has not started yet' });
    if (now > task.windowEnd) return res.status(400).json({ error: 'Task window has ended' });
    const recordedAtDate = recordedAt ? new Date(recordedAt) : new Date(timestamp);
    const age = Date.now() - recordedAtDate.getTime();
    if (age > MAX_AGE_MS || age < -60 * 1000) {
      return res.status(400).json({
        error: 'Recording timestamp is too old or in the future. Record live in the app and submit shortly after.',
      });
    }
    let aiAssessment = null;
    if (framesBase64?.length) {
      try {
        aiAssessment = await analyzeComplianceFrames(framesBase64, recordedAtDate.toISOString());
      } catch (err) {
        console.error('Claude analysis error:', err);
        aiAssessment = {
          passed: false,
          qualitySummary: 'AI analysis failed: ' + (err.message || 'unknown'),
          appearsLive: false,
          timestampsOrIssues: [],
          rawResponse: null,
        };
      }
    }
    const submission = await Submission.create({
      taskId: task._id,
      residentId: String(residentId).trim(),
      timestamp: new Date(timestamp),
      recordedAt: recordedAtDate,
      videoBase64,
      aiAssessment,
    });
    await notifySubmissionReceived({
      taskId: task._id,
      taskName: task.name,
      residentId: submission.residentId,
      submissionId: submission._id,
      recordedAt: submission.recordedAt,
    });
    res.status(201).json({
      id: submission._id,
      taskId: submission.taskId,
      residentId: submission.residentId,
      timestamp: submission.timestamp,
      status: submission.status,
      aiRejected: aiAssessment && !aiAssessment.passed,
      aiAssessment: aiAssessment ? { passed: aiAssessment.passed, qualitySummary: aiAssessment.qualitySummary, appearsLive: aiAssessment.appearsLive, timestampsOrIssues: aiAssessment.timestampsOrIssues } : null,
    });
  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ error: 'Failed to save submission' });
  }
});

// GET /api/submissions - list all for review dashboard
complianceRouter.get(['/submissions', 'submissions'], async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const list = await Submission.find()
      .select('-videoBase64')
      .populate('taskId', 'name description windowStart windowEnd starsAwarded')
      .sort({ createdAt: -1 })
      .lean();
    res.json(list);
  } catch (err) {
    console.error('List submissions error:', err);
    res.json([]);
  }
});

// GET /api/submissions/:id - get one
complianceRouter.get('/submissions/:id', async (req, res) => {
  try {
    const doc = await Submission.findById(req.params.id)
      .populate('taskId', 'name description windowStart windowEnd starsAwarded')
      .lean();
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (err) {
    console.error('Get submission error:', err);
    res.status(500).json({ error: 'Failed to get submission' });
  }
});

// PATCH /api/submissions/:id - update status
complianceRouter.patch('/submissions/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pass', 'fail'].includes(status)) {
      return res.status(400).json({ error: 'status must be "pass" or "fail"' });
    }
    const submission = await Submission.findById(req.params.id).populate('taskId').lean();
    if (!submission) return res.status(404).json({ error: 'Not found' });
    const task = submission.taskId;
    if (submission.status !== 'pending') {
      return res.status(400).json({ error: 'Submission already validated' });
    }
    const updated = await Submission.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .select('-videoBase64')
      .populate('taskId', 'name description windowStart windowEnd starsAwarded')
      .lean();
    if (status === 'pass' && task?.starsAwarded) {
      await ResidentReward.findOneAndUpdate(
        { residentId: submission.residentId },
        { $inc: { stars: task.starsAwarded, totalValidated: 1 } },
        { upsert: true }
      );
      await notifyCheckTriggered({
        taskId: submission.taskId?._id ?? submission.taskId,
        taskName: task?.name,
        residentId: submission.residentId,
        submissionId: submission._id,
        status: 'pass',
        starsAwarded: task.starsAwarded,
      });
    } else if (status === 'fail') {
      await notifyCheckTriggered({
        taskId: submission.taskId?._id ?? submission.taskId,
        taskName: task?.name,
        residentId: submission.residentId,
        submissionId: submission._id,
        status: 'fail',
        starsAwarded: 0,
      });
    }
    res.json(updated);
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

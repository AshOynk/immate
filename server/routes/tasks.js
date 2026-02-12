import { Router } from 'express';
import { Task } from '../models/Task.js';

export const tasksRouter = Router();

// GET /api/tasks - list tasks (optional: active only, in window). Match '' or '/' so proxy works.
tasksRouter.get(['/', ''], async (req, res) => {
  try {
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
    res.status(500).json({ error: err.message || 'Failed to list tasks' });
  }
});

// GET /api/tasks/:id
tasksRouter.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(404).json({ error: 'Not found' });
    const task = await Task.findById(id).lean();
    if (!task) return res.status(404).json({ error: 'Not found' });
    res.json(task);
  } catch (err) {
    console.error('Get task error:', err);
    res.status(500).json({ error: err.message || 'Failed to get task' });
  }
});

// POST /api/tasks - create task (optionally assigned to a resident = push request). Match '' or '/'.
tasksRouter.post(['/', ''], async (req, res) => {
  try {
    const { name, description, windowStart, windowEnd, starsAwarded, eufyTaskId, cufyTaskId, assignedToResidentId } = req.body || {};
    if (!name || !windowStart || !windowEnd) {
      return res.status(400).json({ error: 'Missing required fields: name, windowStart, windowEnd' });
    }
    const task = await Task.create({
      name: String(name).trim(),
      description: description ? String(description).trim() : '',
      windowStart: new Date(windowStart),
      windowEnd: new Date(windowEnd),
      starsAwarded: Number(starsAwarded) || 1,
      active: true,
      ...(assignedToResidentId?.trim() && { assignedToResidentId: assignedToResidentId.trim() }),
      ...((eufyTaskId || cufyTaskId) && { eufyTaskId: (eufyTaskId || cufyTaskId).trim() }),
    });
    res.status(201).json(task);
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: err.message || 'Failed to create task' });
  }
});

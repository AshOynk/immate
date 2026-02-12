import { Router } from 'express';
import { Task } from '../models/Task.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

export const tasksRouter = Router();

// GET /api/tasks - list tasks (optional: active only, in window)
tasksRouter.get('/', async (req, res) => {
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
    res.status(500).json({ error: 'Failed to list tasks' });
  }
});

// GET /api/tasks/:id
tasksRouter.get('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).lean();
    if (!task) return res.status(404).json({ error: 'Not found' });
    res.json(task);
  } catch (err) {
    console.error('Get task error:', err);
    res.status(500).json({ error: 'Failed to get task' });
  }
});

// POST /api/tasks - create task (admin only)
tasksRouter.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description, windowStart, windowEnd, starsAwarded, eufyTaskId, cufyTaskId } = req.body;
    if (!name || !windowStart || !windowEnd) {
      return res.status(400).json({ error: 'Missing required fields: name, windowStart, windowEnd' });
    }
    const task = await Task.create({
      name,
      description: description || '',
      windowStart: new Date(windowStart),
      windowEnd: new Date(windowEnd),
      starsAwarded: starsAwarded ?? 1,
      eufyTaskId: eufyTaskId || cufyTaskId || undefined,
    });
    res.status(201).json(task);
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

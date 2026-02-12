import { Router } from 'express';
import { Submission } from '../models/Submission.js';
import { ResidentReward } from '../models/ResidentReward.js';

export const residentsRouter = Router();

// GET /api/residents - list resident IDs. Match '' or '/' so proxy works.
residentsRouter.get(['/', ''], async (req, res) => {
  try {
    const [fromSubmissions, fromRewards] = await Promise.all([
      Submission.distinct('residentId'),
      ResidentReward.distinct('residentId'),
    ]);
    const ids = [...new Set([...fromSubmissions, ...fromRewards])].filter(Boolean).sort();
    res.json(ids);
  } catch (err) {
    console.error('List residents error:', err);
    res.status(500).json({ error: 'Failed to list residents' });
  }
});

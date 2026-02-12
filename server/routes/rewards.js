import { Router } from 'express';
import { ResidentReward } from '../models/ResidentReward.js';

export const rewardsRouter = Router();

// GET /api/rewards/:residentId - get stars and total validated for a resident
rewardsRouter.get('/:residentId', async (req, res) => {
  try {
    const residentId = String(req.params.residentId).trim();
    let doc = await ResidentReward.findOne({ residentId }).lean();
    if (!doc) {
      doc = { residentId, stars: 0, totalValidated: 0 };
    }
    res.json(doc);
  } catch (err) {
    console.error('Get rewards error:', err);
    res.status(500).json({ error: 'Failed to get rewards' });
  }
});

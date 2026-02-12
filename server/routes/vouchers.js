import { Router } from 'express';
import { ResidentReward } from '../models/ResidentReward.js';

export const vouchersRouter = Router();

// Voucher tiers: stars required -> voucher value (e.g. £5, £10). Configurable via env or default.
const DEFAULT_TIERS = [
  { stars: 5, value: 5, label: '£5 voucher' },
  { stars: 12, value: 10, label: '£10 voucher' },
  { stars: 25, value: 25, label: '£25 voucher' },
  { stars: 50, value: 50, label: '£50 voucher' },
];

function getTiers() {
  try {
    const env = process.env.VOUCHER_TIERS;
    if (env) return JSON.parse(env);
  } catch (e) {
    console.warn('Invalid VOUCHER_TIERS JSON, using defaults');
  }
  return DEFAULT_TIERS;
}

// GET /api/vouchers - list redemption tiers (stars -> voucher value)
vouchersRouter.get('/', (req, res) => {
  try {
    const tiers = getTiers();
    res.json({ tiers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get voucher tiers' });
  }
});

// POST /api/vouchers/redeem - redeem stars for a voucher tier
vouchersRouter.post('/redeem', async (req, res) => {
  try {
    const { residentId, tierIndex } = req.body;
    if (!residentId) {
      return res.status(400).json({ error: 'Missing residentId' });
    }
    const tiers = getTiers();
    const index = tierIndex != null ? Number(tierIndex) : 0;
    const tier = tiers[index];
    if (!tier || tier.stars == null) {
      return res.status(400).json({ error: 'Invalid tier index or tier not found' });
    }
    const residentIdTrimmed = String(residentId).trim();
    const reward = await ResidentReward.findOne({ residentId: residentIdTrimmed });
    const currentStars = reward?.stars ?? 0;
    if (currentStars < tier.stars) {
      return res.status(400).json({
        error: 'Not enough stars',
        required: tier.stars,
        current: currentStars,
      });
    }
    const newStars = currentStars - tier.stars;
    await ResidentReward.findOneAndUpdate(
      { residentId: residentIdTrimmed },
      { $set: { stars: newStars }, $inc: { totalValidated: 0 } },
      { upsert: true, new: true }
    );
    const code = `VOUCH-${Date.now()}-${residentIdTrimmed.slice(0, 4).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    res.json({
      success: true,
      voucher: {
        code,
        value: tier.value,
        label: tier.label,
        starsSpent: tier.stars,
        remainingStars: newStars,
      },
    });
  } catch (err) {
    console.error('Redeem voucher error:', err);
    res.status(500).json({ error: 'Failed to redeem voucher' });
  }
});

import { Router } from 'express';
import { Task } from '../models/Task.js';
import { Submission } from '../models/Submission.js';
import { ResidentReward } from '../models/ResidentReward.js';

export const residentDashboardRouter = Router();

const WEEKLY_STAR_TARGET = Number(process.env.WEEKLY_STAR_TARGET) || 10;

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setUTCDate(diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

function getWeekKey(date) {
  const start = getWeekStart(date);
  return start.toISOString().slice(0, 10);
}

// GET /api/resident/dashboard?residentId=...&name=...
residentDashboardRouter.get('/dashboard', async (req, res) => {
  try {
    const residentId = String(req.query.residentId || '').trim();
    const name = String(req.query.name || '').trim();
    if (!residentId) {
      return res.status(400).json({ error: 'residentId required' });
    }
    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekKey = getWeekKey(now);

    const [tasks, passSubmissions, reward] = await Promise.all([
      Task.find({
        active: true,
        windowStart: { $lte: now },
        windowEnd: { $gte: now },
      })
        .sort({ windowEnd: 1 })
        .lean(),
      Submission.find({
        residentId,
        status: 'pass',
        updatedAt: { $gte: weekStart },
      })
        .populate('taskId', 'name starsAwarded')
        .lean(),
      ResidentReward.findOne({ residentId }).lean(),
    ]);

    const starsThisWeek = passSubmissions.reduce(
      (sum, s) => sum + (s.taskId?.starsAwarded ?? 0),
      0
    );
    const totalStars = reward?.stars ?? 0;
    const bonusClaimedThisWeek = (reward?.bonusClaimedWeeks || []).includes(weekKey);
    const bonusUnlocked = starsThisWeek >= WEEKLY_STAR_TARGET;

    res.json({
      residentId,
      name: name || undefined,
      tasks,
      starsThisWeek,
      weeklyTarget: WEEKLY_STAR_TARGET,
      totalStars,
      totalValidated: reward?.totalValidated ?? 0,
      bonusUnlocked,
      bonusClaimedThisWeek,
      weekEnds: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1),
    });
  } catch (err) {
    console.error('Resident dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// POST /api/resident/claim-bonus - claim weekly bonus (double XP + bonus voucher)
residentDashboardRouter.post('/claim-bonus', async (req, res) => {
  try {
    const { residentId } = req.body;
    if (!residentId?.trim()) {
      return res.status(400).json({ error: 'residentId required' });
    }
    const rid = String(residentId).trim();
    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekKey = getWeekKey(now);

    const [passSubmissions, reward] = await Promise.all([
      Submission.find({
        residentId: rid,
        status: 'pass',
        updatedAt: { $gte: weekStart },
      })
        .populate('taskId', 'starsAwarded')
        .lean(),
      ResidentReward.findOne({ residentId: rid }),
    ]);

    const starsThisWeek = passSubmissions.reduce(
      (sum, s) => sum + (s.taskId?.starsAwarded ?? 0),
      0
    );
    if (starsThisWeek < WEEKLY_STAR_TARGET) {
      return res.status(400).json({
        error: 'Weekly target not reached',
        starsThisWeek,
        weeklyTarget: WEEKLY_STAR_TARGET,
      });
    }
    const alreadyClaimed = (reward?.bonusClaimedWeeks || []).includes(weekKey);
    if (alreadyClaimed) {
      return res.status(400).json({ error: 'Bonus already claimed this week' });
    }

    const bonusStars = starsThisWeek;
    const rewardDoc = await ResidentReward.findOneAndUpdate(
      { residentId: rid },
      {
        $inc: { stars: bonusStars },
        $push: { bonusClaimedWeeks: weekKey },
      },
      { upsert: true, new: true }
    );
    const bonusCode = `BONUS-${weekKey}-${rid.slice(0, 4).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    res.json({
      success: true,
      bonusStars,
      bonusVoucherCode: bonusCode,
      totalStars: rewardDoc.stars,
      message: 'Double XP applied! Bonus voucher unlocked.',
    });
  } catch (err) {
    console.error('Claim bonus error:', err);
    res.status(500).json({ error: 'Failed to claim bonus' });
  }
});

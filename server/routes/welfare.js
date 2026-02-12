import { Router } from 'express';
import { WelfareCheckIn, moodEnum } from '../models/WelfareCheckIn.js';
import { getFirstWelfareMessage, getNextWelfareMessage } from '../services/welfareClaude.js';

export const welfareRouter = Router();

// POST /api/welfare/checkin - start a check-in (mood already selected by user)
welfareRouter.post('/checkin', async (req, res) => {
  try {
    const { residentId, name, mood } = req.body;
    if (!residentId || !mood) {
      return res.status(400).json({ error: 'Missing required fields: residentId, mood' });
    }
    if (!moodEnum.includes(mood)) {
      return res.status(400).json({ error: `mood must be one of: ${moodEnum.join(', ')}` });
    }
    const firstMessage = await getFirstWelfareMessage(mood, name?.trim() || null);
    const checkIn = await WelfareCheckIn.create({
      residentId: String(residentId).trim(),
      name: name?.trim() || undefined,
      mood,
      conversation: [{ role: 'assistant', content: firstMessage }],
      status: 'in_progress',
    });
    res.status(201).json({
      id: checkIn._id,
      residentId: checkIn.residentId,
      name: checkIn.name,
      mood: checkIn.mood,
      message: firstMessage,
      conversation: checkIn.conversation,
    });
  } catch (err) {
    console.error('Welfare checkin start error:', err);
    res.status(500).json({ error: 'Failed to start check-in' });
  }
});

// POST /api/welfare/checkin/:id/message - send user message (text or voice transcript), get AI reply
welfareRouter.post('/checkin/:id/message', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid message text' });
    }
    const checkIn = await WelfareCheckIn.findById(req.params.id);
    if (!checkIn) return res.status(404).json({ error: 'Check-in not found' });
    if (checkIn.status === 'completed') {
      return res.status(400).json({ error: 'This check-in is already completed' });
    }
    const userContent = text.trim().slice(0, 2000);
    checkIn.conversation.push({ role: 'user', content: userContent });
    const reply = await getNextWelfareMessage(checkIn, userContent);
    checkIn.conversation.push({ role: 'assistant', content: reply });
    await checkIn.save();
    res.json({
      message: reply,
      conversation: checkIn.conversation,
    });
  } catch (err) {
    console.error('Welfare message error:', err);
    res.status(500).json({ error: 'Failed to get reply' });
  }
});

// GET /api/welfare/checkin/:id - get session
welfareRouter.get('/checkin/:id', async (req, res) => {
  try {
    const checkIn = await WelfareCheckIn.findById(req.params.id).lean();
    if (!checkIn) return res.status(404).json({ error: 'Not found' });
    res.json(checkIn);
  } catch (err) {
    console.error('Get welfare checkin error:', err);
    res.status(500).json({ error: 'Failed to get check-in' });
  }
});

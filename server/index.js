import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { lessonsRouter } from './routes/lessons.js';
import { progressRouter } from './routes/progress.js';
import { complianceRouter } from './routes/compliance.js';
import { tasksRouter } from './routes/tasks.js';
import { rewardsRouter } from './routes/rewards.js';
import { vouchersRouter } from './routes/vouchers.js';
import { welfareRouter } from './routes/welfare.js';
import { residentDashboardRouter } from './routes/residentDashboard.js';
import { authRouter } from './routes/auth.js';
import { residentsRouter } from './routes/residents.js';
import { Task } from './models/Task.js';
import { Submission } from './models/Submission.js';
import { ResidentReward } from './models/ResidentReward.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Explicit routes so GET /api/residents and GET /api/tasks always work (avoid 404 from router path)
app.get('/api/residents', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const [a, b] = await Promise.all([Submission.distinct('residentId'), ResidentReward.distinct('residentId')]);
    const ids = [...new Set([...a, ...b])].filter(Boolean).sort();
    res.json(ids);
  } catch {
    res.json([]);
  }
});
app.get('/api/tasks', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
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
  } catch {
    res.json([]);
  }
});

async function seedDefaultTasks() {
  const count = await Task.countDocuments();
  if (count > 0) return;
  const now = new Date();
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + 7);
  const defaults = [
    { name: 'Send proof that kitchen is clean', description: 'Record a short video showing the kitchen is clean', windowStart: now, windowEnd, starsAwarded: 1, active: true },
    { name: 'Send proof that bathroom is tidy', description: 'Record a short video showing the bathroom is tidy', windowStart: now, windowEnd, starsAwarded: 1, active: true },
    { name: 'Send proof that your room is tidy', description: 'Record a short video showing your room is tidy', windowStart: now, windowEnd, starsAwarded: 1, active: true },
  ];
  await Task.insertMany(defaults);
  console.log('Seeded default tasks:', defaults.length);
}

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => { console.log('MongoDB connected'); return seedDefaultTasks(); })
    .catch((err) => console.error('MongoDB connection error:', err));
} else {
  console.warn('No MONGODB_URI set; compliance API will fail until configured.');
}
if (process.env.ANTHROPIC_API_KEY) {
  console.log('Claude API key loaded — compliance AI + welfare check-in enabled');
} else {
  console.warn('No ANTHROPIC_API_KEY set; AI features will use fallbacks.');
}

app.use('/api/lessons', lessonsRouter);
app.use('/api/progress', progressRouter);
app.use('/api', complianceRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/residents', residentsRouter);
app.use('/api/rewards', rewardsRouter);
app.use('/api/vouchers', vouchersRouter);
app.use('/api/welfare', welfareRouter);
app.use('/api/resident', residentDashboardRouter);
app.use('/api/auth', authRouter);

const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`CodePath server running at http://localhost:${PORT}`);
});

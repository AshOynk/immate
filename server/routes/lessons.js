import { Router } from 'express';
import { lessons } from '../lessons.js';
import vm from 'vm';
import { runTests } from '../testRunner.js';

export const lessonsRouter = Router();

lessonsRouter.get('/', (req, res) => {
  res.json(lessons.map(({ id, title, description, difficulty }) => ({
    id, title, description, difficulty
  })));
});

lessonsRouter.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const lesson = lessons.find(l => l.id === id);
  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found' });
  }
  res.json(lesson);
});

lessonsRouter.post('/:id/submit', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { code } = req.body;
  const lesson = lessons.find(l => l.id === id);

  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Code is required' });
  }

  const result = runTests(code, lesson);
  res.json(result);
});

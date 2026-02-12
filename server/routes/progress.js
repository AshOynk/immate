import { Router } from 'express';

const progressStore = new Map();
const DEFAULT_USER = 'default';

function getProgress(userId = DEFAULT_USER) {
  if (!progressStore.has(userId)) {
    progressStore.set(userId, {
      completedLessons: [],
      badges: [],
      lastActivity: null
    });
  }
  return progressStore.get(userId);
}

export const progressRouter = Router();

progressRouter.get('/', (req, res) => {
  const userId = req.query.userId || DEFAULT_USER;
  const progress = getProgress(userId);
  res.json(progress);
});

progressRouter.post('/complete', (req, res) => {
  const userId = req.body.userId || DEFAULT_USER;
  const { lessonId } = req.body;
  const progress = getProgress(userId);

  if (!progress.completedLessons.includes(lessonId)) {
    progress.completedLessons.push(lessonId);
  }
  progress.lastActivity = new Date().toISOString();

  const badges = [];
  if (progress.completedLessons.length >= 1 && !progress.badges.includes('first_step')) {
    badges.push('first_step');
    progress.badges.push('first_step');
  }
  if (progress.completedLessons.length >= 3 && !progress.badges.includes('on_fire')) {
    badges.push('on_fire');
    progress.badges.push('on_fire');
  }
  if (progress.completedLessons.length >= 5 && !progress.badges.includes('graduation')) {
    badges.push('graduation');
    progress.badges.push('graduation');
  }

  res.json({ progress, newBadges: badges });
});

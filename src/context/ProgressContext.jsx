import { createContext, useContext, useState, useEffect } from 'react';

const ProgressContext = createContext(null);

const TOTAL_LESSONS = 5;

export function ProgressProvider({ children }) {
  const [completedLessons, setCompletedLessons] = useState([]);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/progress')
      .then(res => res.json())
      .then(data => {
        setCompletedLessons(data.completedLessons || []);
        setBadges(data.badges || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const completeLesson = async (lessonId) => {
    if (completedLessons.includes(lessonId)) return { newBadges: [] };
    const res = await fetch('/api/progress/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId })
    });
    const { progress, newBadges } = await res.json();
    setCompletedLessons(progress.completedLessons);
    setBadges(progress.badges);
    return { newBadges: newBadges || [] };
  };

  const progressPercent = Math.round((completedLessons.length / TOTAL_LESSONS) * 100);

  return (
    <ProgressContext.Provider value={{
      completedLessons,
      badges,
      loading,
      completeLesson,
      progressPercent,
      totalLessons: TOTAL_LESSONS
    }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider');
  return ctx;
}

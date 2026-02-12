import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import './Home.css';

export default function Home() {
  const [lessons, setLessons] = useState([]);
  const { completedLessons } = useProgress();

  useEffect(() => {
    fetch('/api/lessons')
      .then(res => res.json())
      .then(setLessons)
      .catch(() => setLessons([]));
  }, []);

  return (
    <div className="home">
      <section className="hero">
        <h1>Learn to code, your way</h1>
        <p>Bite-sized lessons that build real skills. No jargon, no overwhelm — just you and the code.</p>
      </section>

      <section className="lessons-section">
        <h2>Your path</h2>
        <div className="lesson-cards">
          {lessons.map((lesson, index) => {
            const isCompleted = completedLessons.includes(lesson.id);
            const isLocked = index > 0 && !completedLessons.includes(lessons[index - 1]?.id);
            return (
              <Link
                key={lesson.id}
                to={isLocked ? '#' : `/lesson/${lesson.id}`}
                className={`lesson-card ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}`}
              >
                <div className="lesson-card-header">
                  <span className="lesson-number">{index + 1}</span>
                  {isCompleted && <span className="check">✓</span>}
                  <span className={`difficulty difficulty-${lesson.difficulty}`}>
                    {lesson.difficulty}
                  </span>
                </div>
                <h3>{lesson.title}</h3>
                <p>{lesson.description}</p>
                {isLocked && (
                  <div className="locked-overlay">Complete the previous lesson first</div>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

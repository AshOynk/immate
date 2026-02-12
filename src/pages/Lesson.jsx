import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useProgress } from '../context/ProgressContext';
import './Lesson.css';

export default function Lesson() {
  const { id } = useParams();
  const [lesson, setLesson] = useState(null);
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { completeLesson, completedLessons } = useProgress();

  useEffect(() => {
    fetch(`/api/lessons/${id}`)
      .then(res => res.json())
      .then(data => {
        setLesson(data);
        setCode(data.starterCode || '');
        setResult(null);
      })
      .catch(() => setLesson(null));
  }, [id]);

  const handleRun = async () => {
    if (!lesson) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch(`/api/lessons/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      setResult(data);
      if (data.passed) {
        const { newBadges } = await completeLesson(lesson.id);
        setShowSuccess(true);
        if (newBadges.length > 0) {
          setTimeout(() => setShowSuccess(false), 3000);
        }
      }
    } catch (err) {
      setResult({ passed: false, error: 'Could not run code. Try again!' });
    } finally {
      setRunning(false);
    }
  };

  if (!lesson) {
    return (
      <div className="lesson-loading">
        <p>Loading lesson...</p>
      </div>
    );
  }

  const isCompleted = completedLessons.includes(lesson.id);

  return (
    <div className="lesson">
      <Link to="/" className="back-link">← Back to path</Link>

      <div className="lesson-header">
        <span className={`difficulty difficulty-${lesson.difficulty}`}>
          {lesson.difficulty}
        </span>
        <h1>{lesson.title}</h1>
      </div>

      <section className="explanation">
        <h2>Here's the idea</h2>
        <div className="explanation-text">
          {lesson.explanation.split('\n\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </section>

      <section className="challenge">
        <h2>Your turn</h2>
        <div className="editor-wrap">
          <Editor
            height="280px"
            defaultLanguage="javascript"
            value={code}
            onChange={v => setCode(v || '')}
            theme="vs-light"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: 'JetBrains Mono, monospace',
              lineNumbers: 'on',
              roundedSelection: true,
              scrollBeyondLastLine: false,
              padding: { top: 16 },
              wordWrap: 'on'
            }}
          />
        </div>
        <div className="run-row">
          <button
            className="run-btn"
            onClick={handleRun}
            disabled={running}
          >
            {running ? 'Running...' : 'Run code'}
          </button>
        </div>

        {result && (
          <div className={`result ${result.passed ? 'passed' : 'failed'}`}>
            {result.passed ? (
              <>
                <span className="result-icon">✓</span>
                <div>
                  <strong>{result.message || 'All tests passed!'}</strong>
                  {result.output && (
                    <pre className="result-output">{result.output}</pre>
                  )}
                </div>
              </>
            ) : (
              <>
                <span className="result-icon">✗</span>
                <div>
                  <strong>Not quite yet</strong>
                  {result.error && <p className="result-error">{result.error}</p>}
                  {result.hint && <p className="result-hint">{result.hint}</p>}
                  {result.expected && (
                    <p>Expected: <code>{result.expected}</code></p>
                  )}
                  {result.actual && (
                    <p>Got: <code>{result.actual}</code></p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {showSuccess && isCompleted && (
          <div className="success-toast">
            Lesson complete! 🎉
          </div>
        )}
      </section>
    </div>
  );
}

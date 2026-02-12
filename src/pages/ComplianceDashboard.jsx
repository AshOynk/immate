import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ComplianceDashboard.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

function formatDate(d) {
  return new Date(d).toLocaleString();
}

export default function ComplianceDashboard() {
  const { getAuthHeaders } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const [submission, setSubmission] = useState(null);

  const fetchList = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/submissions`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok) setList(Array.isArray(data) ? data : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const openDetail = async (id) => {
    if (playingId === id) {
      setPlayingId(null);
      setSubmission(null);
      return;
    }
    setPlayingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/submissions/${id}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok) setSubmission(data);
      else setSubmission(null);
    } catch {
      setSubmission(null);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE}/api/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();
      setList((prev) => prev.map((s) => (s._id === id ? { ...s, ...updated } : s)));
      if (submission?._id === id) setSubmission((s) => (s ? { ...s, status } : s));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="compliance-dashboard">
      <h1>Compliance Review Dashboard</h1>
      <p className="compliance-nav">
        <Link to="/compliance">← New submission</Link>
        {' · '}
        <Link to="/compliance/rewards">Stars & vouchers</Link>
      </p>
      {loading ? (
        <p className="dashboard-loading">Loading submissions…</p>
      ) : list.length === 0 ? (
        <p className="dashboard-empty">No submissions yet.</p>
      ) : (
        <ul className="submission-list">
          {list.map((s) => (
            <li key={s._id} className={`submission-item submission-item--${s.status}`}>
              <div className="submission-meta">
                <span className="submission-task">{s.taskId?.name ?? 'Task'}</span>
                <span className="submission-resident">Resident: {s.residentId}</span>
                <span className="submission-time">{formatDate(s.timestamp)}</span>
                <span className="submission-badge">{s.status}</span>
                {s.aiAssessment && (
                  <span className={`ai-badge ai-badge--${s.aiAssessment.passed ? 'pass' : 'fail'}`} title={s.aiAssessment.qualitySummary}>
                    AI {s.aiAssessment.passed ? '✓' : '⚠'}
                  </span>
                )}
              </div>
              <div className="submission-actions">
                <button
                  type="button"
                  className="btn-review"
                  onClick={() => openDetail(s._id)}
                >
                  {playingId === s._id ? 'Hide video' : 'Review video'}
                </button>
                {s.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      className="btn-pass"
                      onClick={() => updateStatus(s._id, 'pass')}
                    >
                      Pass
                    </button>
                    <button
                      type="button"
                      className="btn-fail"
                      onClick={() => updateStatus(s._id, 'fail')}
                    >
                      Fail
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {playingId && submission && (
        <div className="detail-overlay" onClick={() => setPlayingId(null)}>
          <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{submission.taskId?.name ?? 'Task'} — Resident: {submission.residentId}</h3>
            <p className="detail-time">Recorded: {formatDate(submission.recordedAt || submission.timestamp)}</p>
            <p className="detail-status">Status: {submission.status}</p>
            {submission.aiAssessment && (
              <div className="detail-ai">
                <strong>AI check:</strong> {submission.aiAssessment.passed ? 'Passed' : 'Flagged'}
                <p className="detail-ai-summary">{submission.aiAssessment.qualitySummary}</p>
                {submission.aiAssessment.appearsLive === false && <p className="detail-ai-live">Does not appear to be a single live recording.</p>}
                {submission.aiAssessment.timestampsOrIssues?.length > 0 && (
                  <ul className="detail-ai-issues">
                    {submission.aiAssessment.timestampsOrIssues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {submission.videoBase64 && (
              <video
                src={`data:video/webm;base64,${submission.videoBase64}`}
                controls
                autoPlay
                className="detail-video"
              />
            )}
            {submission.status === 'pending' && (
              <div className="detail-actions">
                <button
                  type="button"
                  className="btn-pass"
                  onClick={() => updateStatus(submission._id, 'pass')}
                >
                  Pass
                </button>
                <button
                  type="button"
                  className="btn-fail"
                  onClick={() => updateStatus(submission._id, 'fail')}
                >
                  Fail
                </button>
              </div>
            )}
            <button
              type="button"
              className="btn-close"
              onClick={() => setPlayingId(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

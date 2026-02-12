import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './SendRequest.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

const PRESET_REQUESTS = [
  'Send proof that kitchen is clean',
  'Send proof that bathroom is tidy',
  'Send proof that your room is tidy',
  'Send proof that common area is tidy',
];

export default function SendRequest() {
  const [residentId, setResidentId] = useState('');
  const [residentOptions, setResidentOptions] = useState([]);
  const [taskChoice, setTaskChoice] = useState('preset');
  const [presetTask, setPresetTask] = useState(PRESET_REQUESTS[0]);
  const [customTask, setCustomTask] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('18:00');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}/api/residents`)
      .then((res) => (res.ok ? res.json() : []))
      .then((ids) => {
        if (!cancelled && Array.isArray(ids)) setResidentOptions(ids);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const getTaskName = () => (taskChoice === 'custom' ? customTask.trim() : presetTask);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = getTaskName();
    if (!residentId.trim()) {
      setMessage({ type: 'error', text: 'Select or enter a resident.' });
      return;
    }
    if (!name) {
      setMessage({ type: 'error', text: 'Enter or select a request.' });
      return;
    }
    const now = new Date();
    let windowEnd = new Date(now);
    if (dueDate) {
      const [y, m, d] = dueDate.split('-').map(Number);
      const [hh, mm] = (dueTime || '18:00').split(':').map(Number);
      windowEnd = new Date(y, m - 1, d, hh, mm, 0, 0);
    } else {
      windowEnd.setDate(windowEnd.getDate() + 1);
    }
    if (windowEnd <= now) {
      setMessage({ type: 'error', text: 'Due date/time must be in the future.' });
      return;
    }
    setMessage(null);
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: '',
          windowStart: now.toISOString(),
          windowEnd: windowEnd.toISOString(),
          starsAwarded: 1,
          assignedToResidentId: residentId.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to send request');
      setMessage({ type: 'success', text: `Request sent to ${residentId.trim()}. They will see it on their dashboard.` });
      setResidentId('');
      setCustomTask('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to send request' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="send-request">
      <h1>Send request to resident</h1>
      <p className="send-request-intro">
        Choose a resident and a task. They’ll see it as a request on their dashboard (like a push notification).
      </p>
      <form onSubmit={handleSubmit} className="send-request-form">
        <label>
          Resident
          <select
            value={residentOptions.includes(residentId) ? residentId : ''}
            onChange={(e) => setResidentId(e.target.value)}
          >
            <option value="">Select or type below</option>
            {residentOptions.map((id) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="e.g. RES-ASH or type resident ID"
            value={residentId}
            onChange={(e) => setResidentId(e.target.value)}
            className="send-request-resident-input"
          />
        </label>

        <label>
          Request (task)
        </label>
        <div className="send-request-task-options">
          <label className="send-request-radio">
            <input
              type="radio"
              name="taskChoice"
              checked={taskChoice === 'preset'}
              onChange={() => setTaskChoice('preset')}
            />
            <span>Preset</span>
          </label>
          <select
            value={presetTask}
            onChange={(e) => setPresetTask(e.target.value)}
            disabled={taskChoice !== 'preset'}
          >
            {PRESET_REQUESTS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="send-request-task-options">
          <label className="send-request-radio">
            <input
              type="radio"
              name="taskChoice"
              checked={taskChoice === 'custom'}
              onChange={() => setTaskChoice('custom')}
            />
            <span>Custom</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Send proof that laundry is done"
            value={customTask}
            onChange={(e) => setCustomTask(e.target.value)}
            disabled={taskChoice !== 'custom'}
            className="send-request-custom-input"
          />
        </div>

        <label>
          Due (optional — default: 24 hours from now)
          <div className="send-request-due">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
            />
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
            />
          </div>
        </label>

        {message && (
          <p className={`send-request-message send-request-message--${message.type}`}>
            {message.text}
          </p>
        )}
        <button type="submit" disabled={sending}>
          {sending ? 'Sending…' : 'Send request'}
        </button>
      </form>
      <p className="send-request-back">
        <Link to="/compliance/dashboard">← Back to Review</Link>
      </p>
    </div>
  );
}

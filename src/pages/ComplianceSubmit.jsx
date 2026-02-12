import { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './ComplianceSubmit.css';

const API_BASE = import.meta.env.VITE_API_URL || '';
const MAX_RECORDING_MS = 5 * 60 * 1000; // 5 min
const NUM_FRAMES = 5;

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Extract key frames from a video blob for AI analysis (canvas capture)
function extractFramesFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.onloadeddata = () => {
      const duration = video.duration;
      if (!duration || duration <= 0) {
        URL.revokeObjectURL(url);
        return resolve([]);
      }
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const times = Array.from({ length: NUM_FRAMES }, (_, i) =>
        i === NUM_FRAMES - 1 ? duration - 0.1 : (duration * i) / (NUM_FRAMES - 1)
      );
      let index = 0;
      const frames = [];
      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        canvas.toBlob(
          (b) => {
            if (b) frames.push(b);
            index++;
            if (index < times.length) {
              video.currentTime = times[index];
            } else {
              URL.revokeObjectURL(url);
              resolve(frames);
            }
          },
          'image/jpeg',
          0.7
        );
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video for frame extraction'));
      };
      video.currentTime = times[0];
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video'));
    };
    video.src = url;
  });
}

export default function ComplianceSubmit() {
  const location = useLocation();
  const [tasks, setTasks] = useState([]);
  const [taskId, setTaskId] = useState('');
  const [residentId, setResidentId] = useState(() => location.state?.residentId || '');
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedAt, setRecordedAt] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/tasks?active=true&inWindow=true`)
      .then((r) => r.json())
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setTasks(arr);
        const fromState = location.state?.taskId;
        if (fromState && arr.some((t) => t._id === fromState)) setTaskId(fromState);
        const rid = location.state?.residentId;
        if (rid) setResidentId((prev) => prev || rid);
      })
      .catch(() => setTasks([]));
  }, [location.state?.taskId, location.state?.residentId]);

  const startRecording = useCallback(async () => {
    if (!taskId) {
      setMessage({ type: 'error', text: 'Select a task first.' });
      return;
    }
    if (!residentId.trim()) {
      setMessage({ type: 'error', text: 'Enter resident ID first.' });
      return;
    }
    setMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
      };
      recorder.start(1000);
      setRecordedAt(new Date());
      setRecording(true);
    } catch (err) {
      setMessage({ type: 'error', text: 'Camera/mic access denied or unavailable.' });
    }
  }, [taskId, residentId]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recording) {
      recorderRef.current.stop();
      setRecording(false);
    }
  }, [recording]);

  const discardRecording = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setRecordedBlob(null);
    setPreviewUrl(null);
    setRecordedAt(null);
    setMessage(null);
  }, [previewUrl]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!taskId) {
      setMessage({ type: 'error', text: 'Select a task.' });
      return;
    }
    if (!residentId.trim()) {
      setMessage({ type: 'error', text: 'Enter resident ID.' });
      return;
    }
    if (!recordedBlob || !recordedAt) {
      setMessage({ type: 'error', text: 'Record a video first (live in this app).' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const videoBase64 = await blobToBase64(recordedBlob);
      const frameBlobs = await extractFramesFromBlob(recordedBlob);
      const framesBase64 = await Promise.all(frameBlobs.map(blobToBase64));
      const res = await fetch(`${API_BASE}/api/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          residentId: residentId.trim(),
          timestamp: recordedAt.toISOString(),
          recordedAt: recordedAt.toISOString(),
          videoBase64,
          framesBase64: framesBase64.slice(0, 5),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Submit failed');
      setMessage({ type: 'success', text: data.aiRejected ? 'Submission saved but AI flagged issues. See dashboard.' : 'Submission saved. Complete more tasks to earn stars.' });
      setTaskId('');
      setResidentId('');
      discardRecording();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Submission failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="compliance-submit">
      <h1>Resident Compliance Video Submission</h1>
      <p className="compliance-live-notice">
        Video must be recorded live in this app (camera/mic). No file uploads — ensures current, authentic submissions.
      </p>
      <form onSubmit={onSubmit} className="compliance-form">
        <label>
          Task (within window) *
          <select
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            disabled={loading || recording}
          >
            <option value="">Select a task…</option>
            {tasks.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name} — {new Date(t.windowStart).toLocaleString()} to {new Date(t.windowEnd).toLocaleString()}
              </option>
            ))}
          </select>
          {tasks.length === 0 && <span className="field-hint">No tasks in window. Ask management to add one.</span>}
        </label>
        <label>
          Resident ID *
          <input
            type="text"
            value={residentId}
            onChange={(e) => setResidentId(e.target.value)}
            placeholder="e.g. RES-001"
            disabled={loading || recording}
          />
        </label>
        <label>
          Video (recorded live)
          <div className="recording-zone">
            {!recording && !recordedBlob && (
              <button type="button" className="btn-record" onClick={startRecording} disabled={loading}>
                Start recording
              </button>
            )}
            {recording && (
              <>
                <div className="recording-indicator">
                  <span className="rec-dot" /> Recording… (click Stop when done)
                </div>
                <button type="button" className="btn-stop" onClick={stopRecording}>
                  Stop recording
                </button>
              </>
            )}
            {recordedBlob && !recording && (
              <>
                <video src={previewUrl} controls className="video-preview" />
                <p className="recorded-at">Recorded at: {recordedAt?.toLocaleString()}</p>
                <button type="button" className="btn-discard" onClick={discardRecording} disabled={loading}>
                  Discard & record again
                </button>
              </>
            )}
          </div>
        </label>
        {message && (
          <div className={`form-message form-message--${message.type}`}>
            {message.text}
          </div>
        )}
        <button type="submit" disabled={loading || !recordedBlob || recording}>
          {loading ? 'Submitting & running AI check…' : 'Submit for AI quality check'}
        </button>
      </form>
      <p className="compliance-nav">
        <Link to="/compliance/dashboard">→ Review dashboard</Link>
        {' · '}
        <Link to="/compliance/rewards">Stars & vouchers</Link>
        {' · '}
        <Link to="/welfare">Welfare check-in</Link>
      </p>
    </div>
  );
}

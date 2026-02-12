import { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './ComplianceSubmit.css';

const API_BASE = import.meta.env.VITE_API_URL || '';
const MAX_RECORDING_MS = 5 * 60 * 1000; // 5 min

const now = new Date();
const weekEnd = new Date(now);
weekEnd.setDate(weekEnd.getDate() + 7);
const DEFAULT_TASKS = [
  { _id: 'default-1', name: 'Send proof that kitchen is clean', windowStart: now, windowEnd: weekEnd },
  { _id: 'default-2', name: 'Send proof that bathroom is tidy', windowStart: now, windowEnd: weekEnd },
  { _id: 'default-3', name: 'Send proof that your room is tidy', windowStart: now, windowEnd: weekEnd },
];
const DEFAULT_RESIDENTS = ['RES-ASH', 'RES-001', 'RES-002', 'RES-003'];
const NUM_FRAMES = 5;
const CAMERA_FRONT = 'front';
const CAMERA_BACK = 'back';

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
      if (!Number.isFinite(duration) || duration <= 0) {
        URL.revokeObjectURL(url);
        return resolve([]);
      }
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const times = Array.from({ length: NUM_FRAMES }, (_, i) =>
        i === NUM_FRAMES - 1 ? duration - 0.1 : (duration * i) / (NUM_FRAMES - 1)
      ).filter((t) => Number.isFinite(t) && t >= 0);
      if (times.length === 0) {
        URL.revokeObjectURL(url);
        return resolve([]);
      }
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
              const next = times[index];
              if (Number.isFinite(next)) video.currentTime = next;
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
      const first = times[0];
      if (Number.isFinite(first)) video.currentTime = first;
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
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [taskId, setTaskId] = useState(DEFAULT_TASKS[0]._id);
  const [residentId, setResidentId] = useState(() => location.state?.residentId || 'RES-ASH');
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedAt, setRecordedAt] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(CAMERA_FRONT);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const liveVideoRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices.enumerateDevices()
      .then((devices) => {
        if (cancelled) return;
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setVideoDevices(videoInputs);
        if (videoInputs.length > 0) {
          setSelectedCameraId((prev) => (prev === CAMERA_FRONT || prev === CAMERA_BACK ? prev : videoInputs[0].deviceId));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/tasks?active=true&inWindow=true`)
      .then((r) => r.json())
      .then((list) => {
        const arr = Array.isArray(list) && list.length > 0 ? list : DEFAULT_TASKS;
        setTasks(arr);
        const fromState = location.state?.taskId;
        if (fromState && arr.some((t) => t._id === fromState)) setTaskId(fromState);
        else if (arr.length > 0) setTaskId(arr[0]._id);
        const rid = location.state?.residentId;
        if (rid) setResidentId((prev) => prev || rid);
      })
      .catch(() => {
        setTasks(DEFAULT_TASKS);
        setTaskId(DEFAULT_TASKS[0]._id);
      });
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
      let videoConstraints;
      if (selectedCameraId === CAMERA_FRONT) {
        videoConstraints = { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } };
      } else if (selectedCameraId === CAMERA_BACK) {
        videoConstraints = { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } };
      } else if (selectedCameraId) {
        videoConstraints = { deviceId: { exact: selectedCameraId }, width: { ideal: 1280 }, height: { ideal: 720 } };
      } else {
        videoConstraints = { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } };
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
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
        const when = new Date();
        setRecordedBlob(blob);
        setRecordedAt(when);
        setPreviewUrl(URL.createObjectURL(blob));
      };
      recorder.start(1000);
      setRecording(true);
    } catch (err) {
      setMessage({ type: 'error', text: 'Camera/mic access denied or unavailable.' });
    }
  }, [taskId, residentId, selectedCameraId]);

  // Show live camera feed on the video element when recording starts
  useEffect(() => {
    if (!recording || !streamRef.current) return;
    const video = liveVideoRef.current;
    if (video) {
      video.srcObject = streamRef.current;
      video.play().catch(() => {});
    }
  }, [recording]);

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
    if (!recordedBlob) {
      setMessage({ type: 'error', text: 'Record a video first (live in this app).' });
      return;
    }
    const timestamp = recordedAt || new Date();
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
          timestamp: timestamp.toISOString(),
          recordedAt: timestamp.toISOString(),
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
          Resident *
          <select
            value={DEFAULT_RESIDENTS.includes(residentId) ? residentId : ''}
            onChange={(e) => setResidentId(e.target.value)}
            disabled={loading || recording}
          >
            <option value="">— Select resident —</option>
            {DEFAULT_RESIDENTS.map((id) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
          <input
            type="text"
            value={residentId}
            onChange={(e) => setResidentId(e.target.value)}
            placeholder="Or type resident ID"
            disabled={loading || recording}
            className="compliance-resident-input"
          />
        </label>
        <label>
          Camera
          <select
            value={selectedCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value)}
            disabled={recording || loading}
            className="compliance-camera-select"
          >
            <option value={CAMERA_FRONT}>Front camera (selfie)</option>
            <option value={CAMERA_BACK}>Back camera</option>
            {videoDevices.length > 0 && <option disabled>—— or specific device ——</option>}
            {videoDevices.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Camera ${i + 1}`}
              </option>
            ))}
          </select>
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
                <video
                  ref={liveVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="compliance-live-preview"
                />
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

import { useState, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './WelfareCheckIn.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

const MOODS = [
  { id: 'sad', label: 'Sad', emoji: '😢' },
  { id: 'low', label: 'Low', emoji: '😔' },
  { id: 'neutral', label: 'Okay', emoji: '😐' },
  { id: 'good', label: 'Good', emoji: '🙂' },
  { id: 'happy', label: 'Happy', emoji: '😊' },
];

export default function WelfareCheckIn() {
  const [searchParams] = useSearchParams();
  const [name, setName] = useState(() => searchParams.get('name') || '');
  const [residentId, setResidentId] = useState(() => searchParams.get('residentId') || '');
  const [step, setStep] = useState('intro'); // intro | mood | chat
  const [mood, setMood] = useState(null);
  const [checkInId, setCheckInId] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const displayName = name?.trim() || 'there';

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const startCheckIn = async (selectedMood) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/welfare/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residentId: residentId.trim() || 'anonymous',
          name: name?.trim() || undefined,
          mood: selectedMood,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start check-in');
      setCheckInId(data.id);
      setConversation(data.conversation || [{ role: 'assistant', content: data.message }]);
      setMood(selectedMood);
      setStep('chat');
      if (voiceEnabled && data.message) speak(data.message);
    } catch (err) {
      console.error(err);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || !checkInId) return;
    setInput('');
    setConversation((prev) => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/welfare/checkin/${checkInId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setConversation(data.conversation || [...conversation, { role: 'user', content: msg }, { role: 'assistant', content: data.message }]);
      if (voiceEnabled && data.message) speak(data.message);
    } catch (err) {
      setConversation((prev) => [...prev, { role: 'assistant', content: "Sorry, something went wrong. Try again?" }]);
    } finally {
      setLoading(false);
    }
  };

  function speak(text) {
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setInput((prev) => prev + ' (Voice not supported in this browser)');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-GB';
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join(' ').trim();
      if (transcript) setInput((prev) => (prev ? prev + ' ' + transcript : transcript));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  };

  return (
    <div className="welfare-checkin">
      <h1>Welfare check-in</h1>

      {step === 'intro' && (
        <div className="welfare-intro">
          <p className="welfare-greeting">How are you today, {displayName}?</p>
          <p className="welfare-hint">Share how you're feeling and have a short chat. You can type or use voice — spelling doesn't matter.</p>
          <div className="welfare-fields">
            <input
              type="text"
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Resident ID (optional)"
              value={residentId}
              onChange={(e) => setResidentId(e.target.value)}
            />
          </div>
          <button type="button" className="btn-answer" onClick={() => setStep('mood')}>
            Answer how I'm feeling
          </button>
        </div>
      )}

      {step === 'mood' && (
        <div className="welfare-mood">
          <p className="welfare-greeting">How are you today, {displayName}?</p>
          <div className="mood-icons mood-icons--select">
            {MOODS.map((m) => (
              <button
                key={m.id}
                type="button"
                className="mood-btn"
                disabled={loading}
                onClick={() => startCheckIn(m.id)}
                aria-label={m.label}
                title={m.label}
              >
                <span className="mood-emoji">{m.emoji}</span>
                <span className="mood-label">{m.label}</span>
              </button>
            ))}
          </div>
          {loading && <p className="welfare-loading">Starting your check-in…</p>}
        </div>
      )}

      {step === 'chat' && (
        <div className="welfare-chat">
          <div className="welfare-chat-toolbar">
            <label className="voice-toggle">
              <input
                type="checkbox"
                checked={voiceEnabled}
                onChange={(e) => setVoiceEnabled(e.target.checked)}
              />
              <span>Read replies aloud</span>
            </label>
          </div>
          <ul className="welfare-messages">
            {conversation.map((m, i) => (
              <li key={i} className={`welfare-msg welfare-msg--${m.role}`}>
                <span className="welfare-msg-content">{m.content}</span>
              </li>
            ))}
            {loading && (
              <li className="welfare-msg welfare-msg--assistant">
                <span className="welfare-msg-content welfare-typing">…</span>
              </li>
            )}
            <li ref={messagesEndRef} />
          </ul>
          <form
            className="welfare-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
          >
            <textarea
              className="welfare-input"
              placeholder="Type or say how you're feeling…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
              rows={2}
              disabled={loading}
            />
            <div className="welfare-input-actions">
              <button
                type="button"
                className={`btn-voice ${listening ? 'btn-voice--on' : ''}`}
                onClick={listening ? stopListening : startListening}
                title={listening ? 'Stop listening' : 'Voice input'}
                aria-label={listening ? 'Stop listening' : 'Voice input'}
              >
                {listening ? '⏹' : '🎤'}
              </button>
              <button type="submit" className="btn-send" disabled={loading || !input.trim()}>
                Send
              </button>
            </div>
          </form>
          <p className="welfare-chat-hint">Spelling doesn't matter — say or type in your own words.</p>
        </div>
      )}

      <p className="welfare-nav">
        <Link to="/compliance">← Tasks & proof</Link>
      </p>
    </div>
  );
}

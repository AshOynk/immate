import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import './ResidentDashboard.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

function formatDate(d) {
  return new Date(d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ResidentDashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [residentId, setResidentId] = useState(() => searchParams.get('residentId') || '');
  const [name, setName] = useState(() => searchParams.get('name') || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showRewards, setShowRewards] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState(null);

  const loadDashboard = async (rid, n) => {
    if (!rid?.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ residentId: rid.trim() });
      if (n?.trim()) params.set('name', n.trim());
      const res = await fetch(`${API_BASE}/api/resident/dashboard?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setData(json);
    } catch (e) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const rid = searchParams.get('residentId')?.trim();
    const n = searchParams.get('name')?.trim();
    if (rid) loadDashboard(rid, n);
  }, [searchParams.get('residentId'), searchParams.get('name')]);

  const handleGo = (e) => {
    e.preventDefault();
    const rid = residentId.trim();
    if (!rid) {
      setError('Enter your resident ID');
      return;
    }
    navigate(`/dashboard?residentId=${encodeURIComponent(rid)}${name.trim() ? '&name=' + encodeURIComponent(name.trim()) : ''}`, { replace: true });
    loadDashboard(rid, name.trim());
  };

  const handleClaimBonus = async () => {
    if (!data?.residentId) return;
    setClaiming(true);
    setClaimResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/resident/claim-bonus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ residentId: data.residentId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Claim failed');
      setClaimResult(json);
      setData((prev) => (prev ? { ...prev, totalStars: json.totalStars, bonusClaimedThisWeek: true } : null));
    } catch (e) {
      setClaimResult({ error: e.message });
    } finally {
      setClaiming(false);
    }
  };

  const displayName = data?.name || name?.trim() || 'there';

  if (!data && !loading && !searchParams.get('residentId')) {
    return (
      <div className="resident-dashboard resident-dashboard--welcome">
        <div className="dashboard-chat">
          <div className="msg msg--assistant">
            <div className="msg-content">
              <p><strong>Welcome.</strong> Enter your resident ID to see your tasks and rewards. You'll get notifications when there's something to complete.</p>
            </div>
          </div>
        </div>
        <form onSubmit={handleGo} className="dashboard-login">
          <input
            type="text"
            placeholder="Resident ID"
            value={residentId}
            onChange={(e) => setResidentId(e.target.value)}
          />
          <input
            type="text"
            placeholder="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {error && <p className="dashboard-error">{error}</p>}
          <button type="submit">Go</button>
        </form>
        <p className="dashboard-footer">
          <Link to="/compliance">Submit proof for a task</Link>
          {' · '}
          <Link to="/welfare">Welfare check-in</Link>
        </p>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="resident-dashboard">
        <p className="dashboard-loading">Loading your dashboard…</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="resident-dashboard">
        <p className="dashboard-error">{error}</p>
        <button type="button" onClick={() => navigate('/dashboard')}>Back</button>
      </div>
    );
  }

  if (!data) return null;

  const weekEndStr = data.weekEnds ? formatDate(data.weekEnds) : 'end of week';
  const xpPercent = Math.min(100, (data.starsThisWeek / data.weeklyTarget) * 100);

  return (
    <div className="resident-dashboard">
      <div className="dashboard-chat">
        <div className="msg msg--assistant">
          <div className="msg-content">
            <p>Hi {displayName}. Here's what's going on. Complete tasks when you get a notification to earn stars and unlock rewards.</p>
          </div>
        </div>

        {data.tasks?.length > 0 ? (
          data.tasks.map((task) => (
            <div key={task._id} className="msg msg--assistant msg--task">
              <div className="msg-content">
                <p className="msg-task-title">📋 Task: {task.name}</p>
                {task.description && <p className="msg-task-desc">{task.description}</p>}
                <p className="msg-task-meta">Due by {formatDate(task.windowEnd)} · {task.starsAwarded} star{task.starsAwarded !== 1 ? 's' : ''} when validated</p>
                <Link
                  to="/compliance"
                  state={{ taskId: task._id, residentId: data.residentId }}
                  className="btn-task-submit"
                >
                  Submit proof
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="msg msg--assistant">
            <div className="msg-content">
              <p>No tasks right now. Check back later or you'll get a notification when something's assigned.</p>
            </div>
          </div>
        )}

        <div className="msg msg--assistant msg--rewards-toggle">
          <div className="msg-content">
            <p>Want to see how many rewards you've bagged?</p>
            <button
              type="button"
              className="btn-text"
              onClick={() => setShowRewards((v) => !v)}
            >
              {showRewards ? 'Hide rewards' : 'View my rewards'}
            </button>
          </div>
        </div>

        {showRewards && (
          <div className="msg msg--assistant msg--xp">
            <div className="msg-content">
              <h3 className="xp-title">Your progress this week</h3>
              <p className="xp-earned">You've earned <strong>{data.starsThisWeek}</strong> star{data.starsThisWeek !== 1 ? 's' : ''} so far.</p>
              <div className="xp-bar-wrap">
                <div className="xp-bar" style={{ width: `${xpPercent}%` }} />
                <span className="xp-bar-label">{data.starsThisWeek} / {data.weeklyTarget}</span>
              </div>
              <p className="xp-target">
                By {weekEndStr}, hit <strong>{data.weeklyTarget} stars</strong> to unlock a <strong>bonus voucher</strong> and <strong>double XP</strong> (double rewards for this week).
              </p>
              {data.bonusUnlocked && !data.bonusClaimedThisWeek && (
                <button
                  type="button"
                  className="btn-claim-bonus"
                  onClick={handleClaimBonus}
                  disabled={claiming}
                >
                  {claiming ? 'Claiming…' : 'Claim bonus (double XP + voucher)'}
                </button>
              )}
              {data.bonusClaimedThisWeek && (
                <p className="xp-bonus-done">✓ Bonus claimed this week.</p>
              )}
              {claimResult?.bonusVoucherCode && (
                <div className="claim-result">
                  <p>Bonus voucher: <code>{claimResult.bonusVoucherCode}</code></p>
                  <p>+{claimResult.bonusStars} stars added. Total: {claimResult.totalStars}</p>
                </div>
              )}
              {claimResult?.error && (
                <p className="dashboard-error">{claimResult.error}</p>
              )}
              <p className="xp-total">Total stars: <strong>{data.totalStars}</strong> · {data.totalValidated} task{data.totalValidated !== 1 ? 's' : ''} validated</p>
              <Link to="/compliance/rewards" className="btn-choose-rewards">
                Choose your rewards
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-actions">
        <Link to="/compliance" className="link-action">Submit task proof</Link>
        <Link to="/compliance/rewards" className="link-action">Redeem vouchers</Link>
        <Link to="/welfare" className="link-action">Welfare check-in</Link>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ComplianceRewards.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function ComplianceRewards() {
  const [residentId, setResidentId] = useState('');
  const [rewards, setRewards] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [redeemTier, setRedeemTier] = useState(null);
  const [voucher, setVoucher] = useState(null);
  const [message, setMessage] = useState(null);

  const loadRewards = async (id) => {
    if (!id?.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      const [rRes, tRes] = await Promise.all([
        fetch(`${API_BASE}/api/rewards/${encodeURIComponent(id.trim())}`),
        fetch(`${API_BASE}/api/vouchers`),
      ]);
      const rData = await rRes.json();
      const tData = await tRes.json();
      if (rRes.ok) setRewards(rData);
      else setRewards({ residentId: id.trim(), stars: 0, totalValidated: 0 });
      if (tRes.ok && tData.tiers) setTiers(tData.tiers);
      else setTiers([]);
    } catch {
      setRewards(null);
      setTiers([]);
      setMessage({ type: 'error', text: 'Failed to load rewards.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = (e) => {
    e.preventDefault();
    loadRewards(residentId);
  };

  const handleRedeem = async (e, tierIndex) => {
    e.preventDefault();
    const id = residentId.trim();
    if (!id) {
      setMessage({ type: 'error', text: 'Enter your resident ID first.' });
      return;
    }
    setRedeemTier(tierIndex);
    setMessage(null);
    setVoucher(null);
    try {
      const res = await fetch(`${API_BASE}/api/vouchers/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ residentId: id, tierIndex }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Redeem failed');
      setVoucher(data.voucher);
      setRewards((prev) => (prev ? { ...prev, stars: data.voucher.remainingStars } : null));
      setMessage({ type: 'success', text: `Redeemed ${data.voucher.label}. Code: ${data.voucher.code}` });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Redeem failed' });
    } finally {
      setRedeemTier(null);
    }
  };

  return (
    <div className="compliance-rewards">
      <h1>Stars & Vouchers</h1>
      <p className="rewards-intro">
        Complete tasks and get them validated to earn stars. The more you complete, the more you earn. Redeem stars for vouchers.
      </p>
      <form onSubmit={handleLookup} className="rewards-lookup">
        <input
          type="text"
          value={residentId}
          onChange={(e) => setResidentId(e.target.value)}
          placeholder="Your resident ID"
        />
        <button type="submit" disabled={loading}>Look up my stars</button>
      </form>
      {message && (
        <div className={`rewards-message rewards-message--${message.type}`}>
          {message.text}
        </div>
      )}
      {rewards && (
        <div className="rewards-card">
          <div className="rewards-stars">
            <span className="stars-count">{rewards.stars}</span>
            <span className="stars-label">stars</span>
          </div>
          <p className="rewards-validated">{rewards.totalValidated} tasks validated</p>
          <h3>Redeem for vouchers</h3>
          <ul className="voucher-tiers">
            {tiers.map((tier, i) => (
              <li key={i} className="voucher-tier">
                <span className="tier-label">{tier.label}</span>
                <span className="tier-stars">{tier.stars} stars</span>
                <button
                  type="button"
                  className="btn-redeem"
                  disabled={rewards.stars < tier.stars || redeemTier !== null}
                  onClick={(e) => handleRedeem(e, i)}
                >
                  {redeemTier === i ? 'Redeeming…' : 'Redeem'}
                </button>
              </li>
            ))}
          </ul>
          {voucher && (
            <div className="voucher-result">
              <strong>Your voucher</strong>
              <p className="voucher-code">{voucher.code}</p>
              <p className="voucher-detail">{voucher.label} — {voucher.remainingStars} stars remaining</p>
            </div>
          )}
        </div>
      )}
      <p className="compliance-nav">
        <Link to="/compliance">← Submit task proof</Link>
        {' · '}
        <Link to="/compliance/dashboard">Review dashboard</Link>
      </p>
    </div>
  );
}

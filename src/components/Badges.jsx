import { useProgress } from '../context/ProgressContext';
import './Badges.css';

const BADGE_INFO = {
  first_step: { emoji: '🌱', label: 'First Step' },
  on_fire: { emoji: '🔥', label: 'On Fire' },
  graduation: { emoji: '🎓', label: 'Graduate' }
};

export default function Badges() {
  const { badges } = useProgress();
  const earned = badges.filter(b => BADGE_INFO[b]);

  if (earned.length === 0) return null;

  return (
    <div className="badges">
      {earned.map(id => (
        <div key={id} className="badge" title={BADGE_INFO[id].label}>
          <span className="badge-emoji">{BADGE_INFO[id].emoji}</span>
          <span className="badge-label">{BADGE_INFO[id].label}</span>
        </div>
      ))}
    </div>
  );
}

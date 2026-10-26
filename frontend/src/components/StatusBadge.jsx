import { STATUS } from '../utils/format';

export default function StatusBadge({ status }) {
  const s = STATUS[status] || { label: status, tone: 'neutral' };
  return (
    <span className={`badge badge-${s.tone}`}>
      <span className="dot" />
      {s.label}
    </span>
  );
}

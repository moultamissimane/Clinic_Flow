import { initials } from '../utils/format';

// Stable pastel tone per name so the same patient always gets the same colour.
const TONES = ['teal', 'amber', 'slate', 'rose', 'sky'];

export default function Avatar({ name, size = 'md' }) {
  const hash = [...(name || '')].reduce((h, c) => h + c.charCodeAt(0), 0);
  return <span className={`avatar avatar-${size} tone-${TONES[hash % TONES.length]}`}>{initials(name)}</span>;
}

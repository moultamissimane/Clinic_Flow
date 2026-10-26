// Dates are shown in the browser's time zone, which is expected to be the clinic's.

const pad = (n) => String(n).padStart(2, '0');

// 'YYYY-MM-DD' (no time) is parsed as a local calendar date, never shifted by UTC.
function toDate(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

export const formatDate = (value) => (value ? toDate(value).toLocaleDateString('fr-FR') : '—');

export const formatTime = (value) =>
  value ? toDate(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—';

export const formatDateTime = (value) => (value ? `${formatDate(value)} · ${formatTime(value)}` : '—');

export const formatLongDate = (value = new Date()) =>
  toDate(value).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const toLocalISODate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayISO = () => toLocalISODate(new Date());

// Next quarter hour, as 'HH:mm' — sensible default for a new appointment.
export function nextQuarterHour() {
  const d = new Date();
  d.setMinutes(Math.ceil((d.getMinutes() + 1) / 15) * 15, 0, 0);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Local date + time inputs → ISO 8601 instant (UTC) for the API.
export const combineDateTime = (date, time) => new Date(`${date}T${time}:00`).toISOString();

export function age(birthDate) {
  const b = toDate(birthDate);
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) years--;
  return years;
}

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

export const STATUS = {
  pending: { label: 'En attente', tone: 'warning' },
  confirmed: { label: 'Confirmé', tone: 'success' },
  cancelled: { label: 'Annulé', tone: 'danger' },
};

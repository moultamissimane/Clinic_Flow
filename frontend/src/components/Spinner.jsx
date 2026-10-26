export default function Spinner({ full = false, label = 'Chargement…' }) {
  return (
    <div className={full ? 'spinner-wrap full' : 'spinner-wrap'} role="status">
      <span className="spinner" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

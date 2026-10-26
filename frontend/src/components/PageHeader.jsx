export default function PageHeader({ title, subtitle, children }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      <div className="page-actions">
        <span className="pill pill-open">
          <span className="dot" /> Clinique ouverte
        </span>
        {children}
      </div>
    </header>
  );
}

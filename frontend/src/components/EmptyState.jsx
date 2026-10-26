export default function EmptyState({ icon: Icon, title, text, children }) {
  return (
    <div className="empty">
      {Icon && (
        <span className="empty-icon">
          <Icon size={22} />
        </span>
      )}
      <strong>{title}</strong>
      {text && <p className="muted small">{text}</p>}
      {children}
    </div>
  );
}

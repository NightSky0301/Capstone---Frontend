export default function StatCard({
  label,
  value,
  labelClass = "",
  icon = null,
}) {
  return (
    <div className="stat-card">
      {icon && <span className="stat-icon">{icon}</span>}
      <div className="stat-text">
        <p className={`stat-label ${labelClass}`}>{label}</p>
        <p className="stat-value">{value}</p>
      </div>
    </div>
  );
}

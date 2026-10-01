export default function StatCard({ label, value, labelClass = "" }) {
  return (
    <div className="stat-card">
      <p className={`stat-label ${labelClass}`}>{label}</p>
      <p className="stat-value">{value}</p>
    </div>
  );
}

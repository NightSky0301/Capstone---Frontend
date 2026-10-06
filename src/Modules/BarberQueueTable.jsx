export default function BarberQueueTable({ barbers, onStatusClick }) {
  const availableCount = barbers.filter((b) => b.status === "available").length;
  const busyCount = barbers.length - availableCount;

  return (
    <div className="queue-section">
      <div className="queue-header">
        <p className="queue-label">Barber Queue</p>
        <div className="queue-summary">
          <span className="summary-pill available">
            {availableCount} available
          </span>
          <span className="summary-pill">{busyCount} on service</span>
        </div>
      </div>

      <div className="queue-table-scroll">
        {barbers.length === 0 ? (
          <div className="queue-empty">
            <span className="queue-empty-icon">
              <UsersIcon />
            </span>
            <p className="queue-empty-title">No barbers in the queue yet</p>
            <p className="queue-empty-sub">
              Barbers will show up here once they're added.
            </p>
          </div>
        ) : (
          <table className="queue-table barber-queue-table">
            <thead>
              <tr>
                <th>Barber</th>
                <th>Input</th>
                <th>Heads</th>
              </tr>
            </thead>
            <tbody>
              {barbers.map((barber) => {
                const isAvailable = barber.status === "available";
                return (
                  <tr
                    key={barber.id}
                    className={isAvailable ? "row-available" : ""}
                  >
                    <td>
                      <div className="barber-cell">
                        <span className={`avatar ${isAvailable ? "" : "busy"}`}>
                          {barber.name.charAt(0).toUpperCase()}
                        </span>
                        {barber.name}
                      </div>
                    </td>
                    <td>
                      <button
                        className={`status-button ${isAvailable ? "available" : "busy"}`}
                        onClick={() => onStatusClick(barber)}
                      >
                        {isAvailable ? "Services" : "On Service"}
                      </button>
                    </td>
                    <td>
                      <span className="heads-badge">{barber.heads}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function UsersIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6" />
      <circle cx="17" cy="9" r="2.6" />
      <path d="M16 14.2c2.8.2 5 2.2 5 5.8" />
    </svg>
  );
}

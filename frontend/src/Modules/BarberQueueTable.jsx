export default function BarberQueueTable({ barbers, onStatusClick }) {
  return (
    <div className="queue-section">
      <p className="queue-label">Barber Queue</p>

      <div className="queue-table-scroll">
        <table className="queue-table">
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
                  <td className="barber-cell">
                    <span className="avatar">
                      <PersonIcon />
                    </span>
                    {barber.name}
                  </td>
                  <td>
                    <button
                      className={`status-button ${isAvailable ? "available" : "busy"}`}
                      onClick={() => onStatusClick(barber)}
                    >
                      {isAvailable ? "Services" : "On Service"}
                    </button>
                  </td>
                  <td className="heads-cell">{barber.heads}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PersonIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

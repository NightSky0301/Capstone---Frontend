export default function Header({ onMenuClick, onLogout, role }) {
  const roleLabel =
    role === "admin" ? "Admin" : role === "cashier" ? "Cashier" : null;

  // Cashier has nowhere to navigate to besides Dashboard, so the
  // hamburger/sidebar toggle is pointless clutter for that role.
  const showMenuButton = role !== "cashier";

  return (
    <header className="header">
      <div className="header-left">
        {showMenuButton && (
          <button
            className="hamburger"
            onClick={onMenuClick}
            aria-label="Toggle navigation menu"
          >
            <span />
            <span />
            <span />
          </button>
        )}

        <div className="logo">
          <span>
            People's
            <br />
            Barbershop
          </span>
          <ScissorsIcon />
        </div>
      </div>

      <div className="header-right">
        {roleLabel && (
          <span className={`role-badge role-badge-${role}`}>{roleLabel}</span>
        )}
        <button className="logout-button" onClick={onLogout}>
          Log Out <span aria-hidden="true">→</span>
        </button>
      </div>
    </header>
  );
}

function ScissorsIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <circle cx="6" cy="6" r="2.4" />
      <circle cx="6" cy="18" r="2.4" />
      <line x1="19" y1="4" x2="8" y2="14" />
      <line x1="8" y1="10" x2="19" y2="20" />
    </svg>
  );
}

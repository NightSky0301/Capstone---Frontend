const navItems = [
  { label: "Dashboard", view: "dashboard", Icon: HomeIcon },
  { label: "Inventory", view: "inventory", Icon: BoxIcon },
  { label: "Reports", view: "reports", Icon: ReportIcon },
  { label: "P. Graph", view: "graph", Icon: GraphIcon },
  { label: "Service M.", view: "service", Icon: ServiceIcon },
  { label: "History", view: "history", Icon: HistoryIcon },
];

export default function Sidebar({ isOpen, onClose, onNavigate }) {
  const handleClick = (e, view) => {
    e.preventDefault();
    if (onNavigate) onNavigate(view);
    onClose();
  };

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? "visible" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <nav
        className={`sidebar ${isOpen ? "open" : ""}`}
        aria-label="Main navigation"
      >
        <div className="sidebar-divider" />
        <ul>
          {navItems.map(({ label, view, Icon }) => (
            <li key={label}>
              <a href="#" onClick={(e) => handleClick(e, view)}>
                <Icon />
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

function Icon({ children }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function HomeIcon() {
  return (
    <Icon>
      <path d="m3 10 9-7 9 7" />
      <path d="M5 9v11h14V9" />
      <path d="M9 20v-6h6v6" />
    </Icon>
  );
}

function BoxIcon() {
  return (
    <Icon>
      <path d="m4 7 8-4 8 4-8 4-8-4Z" />
      <path d="M4 7v10l8 4 8-4V7" />
      <path d="M12 11v10" />
    </Icon>
  );
}

function ReportIcon() {
  return (
    <Icon>
      <path d="M5 3h10l4 4v14H5V3Z" />
      <path d="M15 3v5h4M8 17v-4M12 17v-7M16 17v-2" />
    </Icon>
  );
}

function GraphIcon() {
  return (
    <Icon>
      <path d="M4 19V5M4 19h16" />
      <path d="m7 15 4-5 3 3 5-7" />
    </Icon>
  );
}

function ServiceIcon() {
  return (
    <Icon>
      <path d="M12 3v18M3 12h18" />
      <circle cx="12" cy="12" r="7" />
    </Icon>
  );
}

function HistoryIcon() {
  return (
    <Icon>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5M12 7v5l3 2" />
    </Icon>
  );
}

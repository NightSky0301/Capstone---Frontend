import { useState, useMemo } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import StatCard from "./Statcard.jsx";
import BarberQueueTable from "./BarberQueueTable";
import ServicesModal from "./ServicesModal";
import PaymentModal from "./PaymentModal";
import PaymentDetailModal from "./PaymentDetailModal";
import ReceiptModal from "./ReceiptModal";
import { initialBarbers, dashboardStats } from "./mockData";
import "../Css/Dashboard.css";

export default function Dashboard({ onLogout, onNavigate, role }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [barbers, setBarbers] = useState(initialBarbers);

  // The whole booking flow for one barber is tracked with:
  // - modalBarberId: which barber the flow belongs to (null = no flow active)
  // - flowStep: which prompt is currently showing
  const [modalBarberId, setModalBarberId] = useState(null);
  const [flowStep, setFlowStep] = useState(null);
  // 'services' | 'payment' | 'online' | 'detail' | 'receipt'
  const [onlineProvider, setOnlineProvider] = useState(null);
  // 'gcash' | 'paymaya' | 'qrph'

  const resetFlow = () => {
    setModalBarberId(null);
    setFlowStep(null);
    setOnlineProvider(null);
  };

  const toggleBarberStatus = (id) => {
    setBarbers((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              status: b.status === "available" ? "on-service" : "available",
            }
          : b,
      ),
    );
  };

  // Clicking the green "Services" pill (barber is available) starts the
  // booking flow. Clicking the gray "On Service" pill just frees them up
  // directly — no modal chain needed for that.
  const handleStatusClick = (barber) => {
    if (barber.status === "available") {
      setModalBarberId(barber.id);
      setFlowStep("services");
    } else {
      toggleBarberStatus(barber.id);
    }
  };

  // Marks the barber on-service, bumps their head count, and moves them
  // to the front of the array so they land at the top of the busy group.
  // This is only called once the whole payment/receipt flow is finished.
  const handleConfirmService = () => {
    setBarbers((prev) => {
      const target = prev.find((b) => b.id === modalBarberId);
      if (!target) return prev;

      const updated = {
        ...target,
        status: "on-service",
        heads: target.heads + 1,
      };
      const rest = prev.filter((b) => b.id !== modalBarberId);
      return [updated, ...rest];
    });
  };

  // --- Flow step transitions ---

  const handleServicesConfirm = () => {
    setFlowStep("payment");
  };

  const handlePaymentMethodSelect = (methodId) => {
    if (methodId === "cash") {
      setFlowStep("receipt");
    } else {
      setFlowStep("online");
    }
  };

  const handleOnlineProviderSelect = (providerId) => {
    setOnlineProvider(providerId);
    setFlowStep("detail");
  };

  const handlePaymentDetailConfirm = () => {
    setFlowStep("receipt");
  };

  const handleReceiptConfirm = () => {
    handleConfirmService();
    resetFlow();
  };

  // Derived display order: busy barbers first (in their existing relative
  // order), then available barbers (in their existing relative order).
  const sortedBarbers = useMemo(() => {
    const busy = barbers.filter((b) => b.status !== "available");
    const available = barbers.filter((b) => b.status === "available");
    return [...busy, ...available];
  }, [barbers]);

  const formatCurrency = (amount) => `\u20b1${amount.toLocaleString()}`;

  // Falls back to today's real date when mockData has no date set.
  const today =
    dashboardStats.date ||
    new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  // Cashier has nowhere to navigate besides this page, so there's no
  // need to mount the Sidebar (or its overlay) for that role at all.
  const showSidebar = role !== "cashier";

  return (
    <div className="dashboard-root">
      <Header
        onMenuClick={() => setSidebarOpen((v) => !v)}
        onLogout={onLogout}
        role={role}
      />
      {showSidebar && (
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onNavigate={onNavigate}
          role={role}
        />
      )}

      <main className="dashboard-main">
        <div className="dashboard-top">
          <h1 className="dashboard-title">
            DASHBOARD <span className="dashboard-date">{today}</span>
          </h1>

          <div className="status-legend">
            <span className="status-chip">
              <span className="status-dot busy" />
              On Service · Not Available
            </span>
            <span className="status-chip">
              <span className="status-dot available" />
              Services · Available
            </span>
          </div>
        </div>

        <div className="stat-row">
          <StatCard
            icon={<UsersIcon />}
            label="Service Head Count"
            value={dashboardStats.serviceHeadCount}
          />
          <StatCard
            icon={<span className="peso-glyph">₱</span>}
            label="Daily Sales"
            value={formatCurrency(dashboardStats.dailySales)}
          />
          <StatCard
            icon={<CalendarIcon />}
            label="Monthly Sales"
            value={formatCurrency(dashboardStats.monthlySales)}
          />
          <StatCard
            icon={<ScissorsIcon />}
            label="Most Availed Service"
            value={dashboardStats.mostAvailedService}
          />
          <StatCard
            icon={<BoxIcon />}
            label="Stocks"
            labelClass="stat-label-accent"
            value={dashboardStats.stock}
          />
        </div>

        <BarberQueueTable
          barbers={sortedBarbers}
          onStatusClick={handleStatusClick}
        />
      </main>

      <ServicesModal
        isOpen={flowStep === "services"}
        onClose={resetFlow}
        onConfirm={handleServicesConfirm}
      />

      <PaymentModal
        isOpen={flowStep === "payment"}
        mode="method"
        onSelect={handlePaymentMethodSelect}
        onBack={() => setFlowStep("services")}
        onClose={resetFlow}
      />

      <PaymentModal
        isOpen={flowStep === "online"}
        mode="online"
        onSelect={handleOnlineProviderSelect}
        onBack={() => setFlowStep("payment")}
        onClose={resetFlow}
      />

      <PaymentDetailModal
        isOpen={flowStep === "detail"}
        provider={onlineProvider}
        onConfirm={handlePaymentDetailConfirm}
        onBack={() => setFlowStep("online")}
        onClose={resetFlow}
      />

      <ReceiptModal
        isOpen={flowStep === "receipt"}
        onConfirm={handleReceiptConfirm}
        onClose={resetFlow}
      />
    </div>
  );
}

function Svg({ children }) {
  return (
    <svg
      width="22"
      height="22"
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

function UsersIcon() {
  return (
    <Svg>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6" />
      <circle cx="17" cy="9" r="2.6" />
      <path d="M16 14.2c2.8.2 5 2.2 5 5.8" />
    </Svg>
  );
}

function CalendarIcon() {
  return (
    <Svg>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M8 3v3M16 3v3M4 10h16" />
    </Svg>
  );
}

function ScissorsIcon() {
  return (
    <Svg>
      <circle cx="6" cy="6" r="2.4" />
      <circle cx="6" cy="18" r="2.4" />
      <line x1="19" y1="4" x2="8" y2="14" />
      <line x1="8" y1="10" x2="19" y2="20" />
    </Svg>
  );
}

function BoxIcon() {
  return (
    <Svg>
      <path d="m4 7 8-4 8 4-8 4-8-4Z" />
      <path d="M4 7v10l8 4 8-4V7" />
      <path d="M12 11v10" />
    </Svg>
  );
}

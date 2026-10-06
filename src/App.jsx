import { useState } from "react";
import Login from "./Modules/Login";
import Dashboard from "./Modules/Dashboard";
import Inventory from "./Modules/Inventory";
import Reports from "./Modules/Reports";
import PerformanceGraph from "./Modules/PerformanceGraph";
import ServiceManagement from "./Modules/ServiceManagement";
import History from "./Modules/History";

// Views a cashier is allowed to reach. Everything else (inventory,
// reports, graph, service management, history) is admin-only private
// data and must never render for a cashier — whether someone tries to
// get there via the sidebar or any other call to onNavigate.
const CASHIER_ALLOWED_VIEWS = ["dashboard"];

export default function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState("dashboard");

  const handleLogin = async (username, password) => {
    // Temporary hardcoded credentials until a real backend/auth exists.
    if (username === "admin" && password === "1234") {
      setUser({ name: "Admin", role: "admin" });
      setCurrentView("dashboard");
    } else if (username === "cashier" && password === "1234") {
      setUser({ name: "Cashier", role: "cashier" });
      setCurrentView("dashboard");
    } else {
      throw new Error("Incorrect username or password.");
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView("dashboard");
  };

  const handleNavigate = (view) => {
    const knownViews = [
      "dashboard",
      "inventory",
      "reports",
      "graph",
      "service",
      "history",
    ];

    if (!knownViews.includes(view)) {
      alert(`"${view}" isn't built yet.`);
      return;
    }

    // Cashier is locked to the allowed views regardless of how
    // navigation was triggered.
    if (user?.role === "cashier" && !CASHIER_ALLOWED_VIEWS.includes(view)) {
      setCurrentView("dashboard");
      return;
    }

    setCurrentView(view);
  };

  if (!user) {
    return (
      <Login
        onLogin={handleLogin}
        onForgotPassword={() => alert("Hook this up to your reset flow")}
      />
    );
  }

  // Belt-and-suspenders: even if currentView somehow got set to a
  // restricted view (e.g. stale state), a cashier never actually renders
  // a restricted module.
  const effectiveView =
    user.role === "cashier" && !CASHIER_ALLOWED_VIEWS.includes(currentView)
      ? "dashboard"
      : currentView;

  if (effectiveView === "inventory") {
    return (
      <Inventory
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        role={user.role}
      />
    );
  }

  if (effectiveView === "reports") {
    return (
      <Reports
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        role={user.role}
      />
    );
  }

  if (effectiveView === "graph") {
    return (
      <PerformanceGraph
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        role={user.role}
      />
    );
  }

  if (effectiveView === "service") {
    return (
      <ServiceManagement
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        role={user.role}
      />
    );
  }

  if (effectiveView === "history") {
    return (
      <History
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        role={user.role}
      />
    );
  }

  return (
    <Dashboard
      onLogout={handleLogout}
      onNavigate={handleNavigate}
      role={user.role}
    />
  );
}

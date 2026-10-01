import { useState } from "react";
import Login from "./Modules/Login";
import Dashboard from "./Modules/Dashboard";
import Inventory from "./Modules/Inventory";
import Reports from "./Modules/Reports";
import PerformanceGraph from "./Modules/PerformanceGraph";
import ServiceManagement from "./Modules/ServiceManagement";
import History from "./Modules/History";

export default function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState("dashboard");

  const handleLogin = async (username, password) => {
    if (username === "admin" && password === "1234") {
      setUser({ name: "Admin" });
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
    if (
      [
        "dashboard",
        "inventory",
        "reports",
        "graph",
        "service",
        "history",
      ].includes(view)
    ) {
      setCurrentView(view);
    } else {
      alert(`"${view}" isn't built yet.`);
    }
  };

  if (!user) {
    return (
      <Login
        onLogin={handleLogin}
        onForgotPassword={() => alert("Hook this up to your reset flow")}
      />
    );
  }

  if (currentView === "inventory") {
    return <Inventory onLogout={handleLogout} onNavigate={handleNavigate} />;
  }

  if (currentView === "reports") {
    return <Reports onLogout={handleLogout} onNavigate={handleNavigate} />;
  }

  if (currentView === "graph") {
    return (
      <PerformanceGraph onLogout={handleLogout} onNavigate={handleNavigate} />
    );
  }

  if (currentView === "service") {
    return (
      <ServiceManagement onLogout={handleLogout} onNavigate={handleNavigate} />
    );
  }

  if (currentView === "history") {
    return <History onLogout={handleLogout} onNavigate={handleNavigate} />;
  }

  return <Dashboard onLogout={handleLogout} onNavigate={handleNavigate} />;
}

import { useState } from "react";
import Login from "./Modules/Login";
import Dashboard from "./Modules/Dashboard";
import Inventory from "./Modules/Inventory";
import Reports from "./Modules/Reports";
import PerformanceGraph from "./Modules/PerformanceGraph";
import ServiceManagement from "./Modules/ServiceManagement";
import History from "./Modules/History";

const API_URL = "http://localhost:3000";

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [currentView, setCurrentView] = useState("dashboard");

  const handleLogin = async (username, password) => {
    const response = await fetch(`${API_URL}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed.");
    }

    setUser(data.user);
    setToken(data.token);
    setCurrentView("dashboard");
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await fetch(`${API_URL}/api/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setToken(null);
      setUser(null);
      setCurrentView("dashboard");
    }
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
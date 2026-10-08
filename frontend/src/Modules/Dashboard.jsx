import { useState, useEffect } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import StatCard from "./Statcard.jsx";
import BarberQueueTable from "./BarberQueueTable";
import TransactionModal from "./TransactionModal";
import { dashboardStats } from "./mockData";
import "../Css/Dashboard.css";

const API_URL = "http://localhost:3000/api";

export default function Dashboard({ onLogout, onNavigate, token }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeBarbers, setActiveBarbers] = useState([]);
  const [poolBarbers, setPoolBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draggedBarber, setDraggedBarber] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [transactionBarber, setTransactionBarber] = useState(null);

  // Helper: API call with Bearer token
  const api = async (endpoint, options = {}) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    return response.json();
  };

  // Load active barbers and pool on mount + after changes
  useEffect(() => {
    const loadBarbers = async () => {
      try {
        setLoading(true);
        setError(null);
        const active = await api("/barbers");
        const pool = await api("/barbers/pool");
        setActiveBarbers(active);
        setPoolBarbers(pool);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadBarbers();
  }, [reloadKey]);

  // Add barber to active queue
  const handleAddToQueue = async (barber) => {
    try {
      await api(`/barbers/${barber.id}/add-to-queue`, {
        method: "POST",
      });
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    }
  };

  // Remove barber from active queue
  const handleRemoveFromQueue = async (barber) => {
    try {
      await api(`/barbers/${barber.id}/remove-from-queue`, {
        method: "PUT",
      });
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    }
  };

  // Drag-and-drop reorder
  const handleDragStart = (barber) => {
    setDraggedBarber(barber);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (targetBarber) => {
    if (!draggedBarber || draggedBarber.id === targetBarber.id) {
      setDraggedBarber(null);
      return;
    }
    try {
      const newOrder = activeBarbers.map((b) => b.id);
      const draggedIndex = newOrder.indexOf(draggedBarber.id);
      const targetIndex = newOrder.indexOf(targetBarber.id);
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedBarber.id);
      await api("/barbers/reorder", {
        method: "PUT",
        body: JSON.stringify({ barber_ids: newOrder }),
      });
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setDraggedBarber(null);
    }
  };

  const formatCurrency = (amount) => `\u20b1${amount.toLocaleString()}`;

  if (loading) return <div className="dashboard-root">Loading...</div>;

  return (
    <div className="dashboard-root">
      <Header
        onMenuClick={() => setSidebarOpen((v) => !v)}
        onLogout={onLogout}
      />
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={onNavigate}
      />

      <main className="dashboard-main">
        <div className="dashboard-top">
          <div>
            <h1 className="dashboard-title">
              DASHBOARD{" "}
              <span className="dashboard-date">{dashboardStats.date}</span>
            </h1>
          </div>
          <div className="status-legend">
            <p>On Service - Not Available</p>
            <p>Services - Available</p>
          </div>
        </div>

        {error && (
          <div style={{ color: "red", marginBottom: "10px" }}>
            Error: {error}
          </div>
        )}

        <div className="stat-row">
          <StatCard
            label="Service Head Count"
            value={dashboardStats.serviceHeadCount}
          />
          <StatCard
            label="Daily Sales"
            value={formatCurrency(dashboardStats.dailySales)}
          />
          <StatCard
            label="Monthly Sales"
            value={formatCurrency(dashboardStats.monthlySales)}
          />
          <StatCard
            label="Most Availed Service"
            value={dashboardStats.mostAvailedService}
          />
          <StatCard
            label="Stocks"
            labelClass="stat-label-accent"
            value={dashboardStats.stock}
          />
        </div>

        {/* Barber Pool Section */}
        <div className="pool-section">
          <p className="pool-label">Barber Pool (Not Working Today)</p>
          {poolBarbers.length === 0 ? (
            <p style={{ color: "#999", fontSize: "14px" }}>
              All barbers are in the active queue.
            </p>
          ) : (
            <div className="pool-list">
              {poolBarbers.map((barber) => (
                <div key={barber.id} className="pool-item">
                  <span className="pool-barber-name">{barber.name}</span>
                  <button
                    className="btn-add-queue"
                    onClick={() => handleAddToQueue(barber)}
                  >
                    Add to Queue
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Barber Queue Section */}
        <div className="queue-section">
          <p className="queue-label">Active Barber Queue</p>
          <div className="queue-table-scroll">
            <table className="queue-table">
              <thead>
                <tr>
                  <th>Barber</th>
                  <th>Status</th>
                  <th>Heads</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeBarbers.map((barber) => {
                  const isAvailable = barber.status === "available";
                  return (
                    <tr
                      key={barber.id}
                      className={`${isAvailable ? "row-available" : ""} ${draggedBarber?.id === barber.id ? "dragging" : ""}`}
                      draggable
                      onDragStart={() => handleDragStart(barber)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(barber)}
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
                          onClick={() => setTransactionBarber(barber)}
                        >
                          {isAvailable ? "Services" : "On Service"}
                        </button>
                      </td>
                      <td className="heads-cell">{barber.heads || 0}</td>
                      <td>
                        <button
                          className="btn-remove-queue"
                          onClick={() => handleRemoveFromQueue(barber)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {transactionBarber && (
        <TransactionModal
          token={token}
          barber={transactionBarber}
          onDone={() => {
            setTransactionBarber(null);
            setReloadKey((k) => k + 1); // reload queue so status/order are current
          }}
        />
      )}
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
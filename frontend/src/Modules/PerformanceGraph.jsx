import { useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Header from "./Header";
import Sidebar from "./Sidebar";
import {
  barberPerformance,
  monthlySales,
  dailySalesPerformance,
  greatestBarbero,
  thisMonthSale,
} from "./mockData";
import "../Css/Dashboard.css";
import "../Css/PerformanceGraph.css";

const PEAK_COLOR = "#5fff5f";
const HIGH_COLOR = "#6dbf6d";
const AVERAGE_COLOR = "#1f5c1f";

function tierColor(heads) {
  if (heads >= 70) return PEAK_COLOR;
  if (heads >= 45) return HIGH_COLOR;
  return AVERAGE_COLOR;
}

const formatCurrency = (n) => `\u20b1${n.toLocaleString()}`;

export default function PerformanceGraph({ onLogout, onNavigate }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view, setView] = useState("barber");

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
            <button
              className="back-to-dashboard"
              onClick={() => onNavigate("dashboard")}
            >
              ← Dashboard
            </button>
            <h1 className="dashboard-title">Performance Graph (Monthly)</h1>
          </div>
        </div>

        <div className="perf-panel">
          <div className="perf-chart-card">
            <div className="perf-chart-header">
              <span className="perf-axis-label">
                {view === "barber" ? "Head" : "Sales"}
              </span>
              <span className="perf-chart-title">
                {view === "barber"
                  ? "Barber's Performance Graph"
                  : "Monthly Sale Performance Graph"}
              </span>
              {view === "barber" ? (
                <button
                  className="perf-nav-link"
                  onClick={() => setView("monthly")}
                >
                  Next
                </button>
              ) : (
                <button
                  className="perf-nav-link"
                  onClick={() => setView("barber")}
                >
                  Previous
                </button>
              )}
            </div>

            <div className="perf-chart-body">
              {view === "barber" ? (
                barberPerformance.length === 0 ? (
                  <EmptyState />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barberPerformance}>
                      <CartesianGrid vertical={false} stroke="#eee" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="heads" radius={[4, 4, 0, 0]}>
                        {barberPerformance.map((entry, i) => (
                          <Cell key={i} fill={tierColor(entry.heads)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )
              ) : monthlySales.length === 0 ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlySales}>
                    <CartesianGrid vertical={false} stroke="#eee" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => `\u20b1${v.toLocaleString()}`}
                    />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {monthlySales.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={tierColor((entry.amount / 25000) * 100)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="perf-side">
            <div className="perf-info-card">
              {view === "barber" ? (
                <>
                  <p className="perf-info-label">
                    Greatest Barbero of All Time
                  </p>
                  <p className="perf-info-value">
                    {greatestBarbero
                      ? `${greatestBarbero.name} | ${greatestBarbero.heads}`
                      : "—"}
                  </p>
                </>
              ) : (
                <>
                  <p className="perf-info-label">This Month's Sale</p>
                  <p className="perf-info-value">
                    {formatCurrency(thisMonthSale)}
                  </p>
                </>
              )}
            </div>

            <div className="perf-daily-card">
              <p className="perf-daily-title">Daily Sales Performance</p>
              {dailySalesPerformance.length === 0 ? (
                <EmptyState small />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={dailySalesPerformance}>
                    <CartesianGrid vertical={false} stroke="#eee" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => `\u20b1${v.toLocaleString()}`}
                    />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#5fff5f"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#5fff5f" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        <div className="perf-legend">
          <span className="legend-item">
            <span className="legend-dot" style={{ background: PEAK_COLOR }} />
            Peak Performance
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: HIGH_COLOR }} />
            High Performance
          </span>
          <span className="legend-item">
            <span
              className="legend-dot"
              style={{ background: AVERAGE_COLOR }}
            />
            Average Performance
          </span>
        </div>
      </main>
    </div>
  );
}

function EmptyState({ small }) {
  return (
    <div className={`perf-empty-state ${small ? "small" : ""}`}>
      No data yet
    </div>
  );
}

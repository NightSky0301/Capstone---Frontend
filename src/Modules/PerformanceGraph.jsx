import { useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  AreaChart,
  Area,
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

/* ------------------------- Performance tiers ------------------------- */

const TIERS = {
  peak: { key: "peak", label: "Peak Performance", color: "#4ade80" },
  high: { key: "high", label: "High Performance", color: "#5fb85c" },
  average: { key: "average", label: "Average Performance", color: "#2f6f3a" },
};

// PLACEHOLDER thresholds. Replace with the shop's real targets.
// Barber chart: heads served in the month.
const BARBER_HEADS = { peak: 70, high: 45 };
// Monthly chart: total sales in pesos (70% / 45% of a ₱25,000 target).
const MONTHLY_SALES = { peak: 17500, high: 11250 };

function tierFor(value, limits) {
  if (value >= limits.peak) return TIERS.peak;
  if (value >= limits.high) return TIERS.high;
  return TIERS.average;
}

// Gradient fills for the bars (one per tier).
const TIER_DEFS = (
  <defs>
    {Object.values(TIERS).map((tier) => (
      <linearGradient
        key={tier.key}
        id={`perf-grad-${tier.key}`}
        x1="0"
        y1="0"
        x2="0"
        y2="1"
      >
        <stop offset="0%" stopColor={tier.color} stopOpacity={1} />
        <stop offset="100%" stopColor={tier.color} stopOpacity={0.72} />
      </linearGradient>
    ))}
  </defs>
);

/* ---------------------------- Formatters ---------------------------- */

const formatCurrency = (n) => `\u20b1${n.toLocaleString()}`;

// 20000 -> "₱20k", 2500 -> "₱2.5k"
const formatCompact = (n) =>
  n >= 1000 ? `\u20b1${Number((n / 1000).toFixed(1))}k` : `\u20b1${n}`;

const tooltipProps = {
  cursor: { fill: "rgba(227, 183, 136, 0.18)" },
  contentStyle: {
    borderRadius: 12,
    border: "none",
    boxShadow: "0 8px 24px rgba(47, 44, 41, 0.18)",
    fontSize: 13,
    fontFamily: '"Work Sans", sans-serif',
  },
  labelStyle: { fontWeight: 600, color: "#2b2b2b" },
};

/* ------------------------------ Page ------------------------------ */

export default function PerformanceGraph({ onLogout, onNavigate, role }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view, setView] = useState("barber"); // 'barber' | 'monthly'

  return (
    <div className="dashboard-root">
      <Header
        onMenuClick={() => setSidebarOpen((v) => !v)}
        onLogout={onLogout}
        role={role}
      />
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={onNavigate}
        role={role}
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

        <div className="perf-layout">
          {/* ---------------- Main chart card ---------------- */}
          <section className="perf-card perf-chart-card">
            <div className="perf-card-head">
              <span className="perf-axis-label">
                {view === "barber" ? "Head" : "Sales"}
              </span>

              <p className="perf-chart-title">
                {view === "barber"
                  ? "Barber's Performance Graph"
                  : "Monthly Sale Performance Graph"}
              </p>

              {view === "barber" ? (
                <button
                  className="perf-nav-link"
                  onClick={() => setView("monthly")}
                >
                  Next <span aria-hidden="true">→</span>
                </button>
              ) : (
                <button
                  className="perf-nav-link"
                  onClick={() => setView("barber")}
                >
                  <span aria-hidden="true">←</span> Previous
                </button>
              )}
            </div>

            <div className="perf-chart-body">
              {view === "barber" ? (
                barberPerformance.length === 0 ? (
                  <EmptyState
                    icon={<BarsIcon />}
                    title="No barber performance yet"
                    sub="Heads served per barber will appear here once transactions are recorded."
                  />
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={barberPerformance}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      {TIER_DEFS}
                      <CartesianGrid vertical={false} stroke="#f0ece5" />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: "#6b6b68" }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={44}
                        allowDecimals={false}
                        tick={{ fontSize: 12, fill: "#a5a5a2" }}
                      />
                      <Tooltip
                        {...tooltipProps}
                        formatter={(v) => [v, "Heads"]}
                      />
                      <Bar
                        dataKey="heads"
                        radius={[10, 10, 0, 0]}
                        maxBarSize={56}
                      >
                        {barberPerformance.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={`url(#perf-grad-${tierFor(entry.heads, BARBER_HEADS).key})`}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )
              ) : monthlySales.length === 0 ? (
                <EmptyState
                  icon={<BarsIcon />}
                  title="No monthly sales yet"
                  sub="Monthly totals will appear here once sales are recorded."
                />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={monthlySales}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    {TIER_DEFS}
                    <CartesianGrid vertical={false} stroke="#f0ece5" />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: "#6b6b68" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={56}
                      tick={{ fontSize: 12, fill: "#a5a5a2" }}
                      tickFormatter={formatCompact}
                    />
                    <Tooltip
                      {...tooltipProps}
                      formatter={(v) => [formatCurrency(v), "Sales"]}
                    />
                    <Bar
                      dataKey="amount"
                      radius={[10, 10, 0, 0]}
                      maxBarSize={56}
                    >
                      {monthlySales.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={`url(#perf-grad-${tierFor(entry.amount, MONTHLY_SALES).key})`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          {/* ---------------- Side column ---------------- */}
          <aside className="perf-side">
            <div className="perf-card perf-info-card">
              {view === "barber" ? (
                <>
                  <span className="stat-icon">
                    <TrophyIcon />
                  </span>
                  <div className="perf-info-text">
                    <p className="perf-info-label">
                      Greatest Barbero of All Time
                    </p>
                    <p className="perf-info-value">
                      {greatestBarbero ? greatestBarbero.name : "—"}
                    </p>
                    {greatestBarbero && (
                      <p className="perf-info-sub">
                        {greatestBarbero.heads} heads
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <span className="stat-icon">
                    <span className="peso-glyph">₱</span>
                  </span>
                  <div className="perf-info-text">
                    <p className="perf-info-label">This Month's Sale</p>
                    <p className="perf-info-value">
                      {formatCurrency(thisMonthSale)}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="perf-card perf-daily-card">
              <p className="perf-daily-title">Daily Sales Performance</p>

              {dailySalesPerformance.length === 0 ? (
                <EmptyState
                  small
                  icon={<TrendIcon />}
                  title="No daily sales yet"
                  sub="Daily totals will appear here."
                />
              ) : (
                <div className="perf-daily-chart">
                  <div className="perf-daily-chart-inner">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={dailySalesPerformance}
                        margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="perf-area-grad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#5fb85c"
                              stopOpacity={0.35}
                            />
                            <stop
                              offset="100%"
                              stopColor="#5fb85c"
                              stopOpacity={0.02}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#f0ece5" />
                        <XAxis
                          dataKey="day"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: "#6b6b68" }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          width={44}
                          tick={{ fontSize: 11, fill: "#a5a5a2" }}
                          tickFormatter={formatCompact}
                        />
                        <Tooltip
                          {...tooltipProps}
                          cursor={{ stroke: "#e3b788", strokeWidth: 1 }}
                          formatter={(v) => [formatCurrency(v), "Sales"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="amount"
                          stroke="#4fa34c"
                          strokeWidth={3}
                          fill="url(#perf-area-grad)"
                          dot={{
                            r: 4,
                            fill: "#fff",
                            stroke: "#4fa34c",
                            strokeWidth: 2,
                          }}
                          activeDot={{ r: 6 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>

        <div className="perf-legend">
          {Object.values(TIERS).map((tier) => (
            <span key={tier.key} className="perf-legend-chip">
              <span
                className="perf-legend-dot"
                style={{ background: tier.color }}
              />
              {tier.label}
            </span>
          ))}
        </div>
      </main>
    </div>
  );
}

/* ---------------------------- Empty state ---------------------------- */

function EmptyState({ icon, title, sub, small }) {
  return (
    <div className={`queue-empty perf-empty ${small ? "small" : ""}`}>
      <span className="queue-empty-icon">{icon}</span>
      <p className="queue-empty-title">{title}</p>
      <p className="queue-empty-sub">{sub}</p>
    </div>
  );
}

/* ------------------------------ Icons ------------------------------ */

function Svg({ children, size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
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

function TrophyIcon() {
  return (
    <Svg>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H5.5a1.5 1.5 0 0 0 0 3H8" />
      <path d="M16 6h2.5a1.5 1.5 0 0 1 0 3H16" />
      <path d="M12 13v4M9 20h6M10 17h4" />
    </Svg>
  );
}

function BarsIcon() {
  return (
    <Svg size={26}>
      <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
    </Svg>
  );
}

function TrendIcon() {
  return (
    <Svg size={26}>
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </Svg>
  );
}

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import StatCard from "./Statcard";
import { transactions as initialTransactions } from "./mockData";
import "../Css/Dashboard.css";
import "../Css/History.css";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const VOID_REASONS = ["Wrong Input", "Duplicated Transac", "Wrong Payment"];

const METHOD_LABELS = {
  cash: "Cash",
  gcash: "Gcash",
  paymaya: "Paymaya",
  qrph: "QRPH",
};
const methodLabel = (m) => METHOD_LABELS[m] || (m ? String(m) : "");

const formatCurrency = (n) => `\u20b1${Number(n).toLocaleString()}`;

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function History({ onLogout, onNavigate, role }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [transactionList, setTransactionList] = useState(initialTransactions);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [voidingId, setVoidingId] = useState(null);

  const dutyLabel = role === "cashier" ? "Cashier" : "Admin";

  // Newest first.
  const dayTransactions = useMemo(
    () =>
      transactionList
        .filter((t) => sameDay(new Date(t.date), selectedDate))
        .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [transactionList, selectedDate],
  );

  const daySales = useMemo(
    () => dayTransactions.reduce((sum, t) => sum + t.amount, 0),
    [dayTransactions],
  );

  const totalTransaction = transactionList.length;
  const totalSales = useMemo(
    () => transactionList.reduce((sum, t) => sum + t.amount, 0),
    [transactionList],
  );

  const dateLabel = selectedDate.toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });

  const todayDate = new Date();

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = firstOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];
    for (let i = startOffset - 1; i >= 0; i--) {
      cells.push({
        day: daysInPrevMonth - i,
        inMonth: false,
        date: new Date(year, month - 1, daysInPrevMonth - i),
      });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, inMonth: true, date: new Date(year, month, d) });
    }
    while (cells.length % 7 !== 0 || cells.length < 42) {
      const nextDay = cells.length - (startOffset + daysInMonth) + 1;
      cells.push({
        day: nextDay,
        inMonth: false,
        date: new Date(year, month + 1, nextDay),
      });
    }
    return cells;
  }, [calendarMonth]);

  const changeMonth = (delta) => {
    setCalendarMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1),
    );
  };

  const toggleCalendar = () => {
    if (!calendarOpen) setCalendarMonth(selectedDate);
    setCalendarOpen((v) => !v);
  };

  const handlePickDate = (date) => {
    setSelectedDate(date);
    setCalendarMonth(date);
    setCalendarOpen(false);
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setSelectedDate(now);
    setCalendarMonth(now);
    setCalendarOpen(false);
  };

  const handleVoidConfirm = () => {
    setTransactionList((prev) => prev.filter((t) => t.id !== voidingId));
    setVoidingId(null);
  };

  const voidingTransaction =
    transactionList.find((t) => t.id === voidingId) || null;

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
            <h1 className="dashboard-title">History Transactions</h1>
          </div>
        </div>

        <div className="hist-top-row">
          <StatCard
            icon={<ReceiptIcon />}
            label="Total Transactions"
            value={totalTransaction}
          />
          <StatCard
            icon={<span className="peso-glyph">₱</span>}
            label="Sales"
            value={formatCurrency(totalSales)}
          />

          <div className="hist-date-wrap">
            <button
              className="hist-date-button"
              onClick={toggleCalendar}
              aria-haspopup="dialog"
              aria-expanded={calendarOpen}
            >
              <CalendarIcon />
              <span>{dateLabel}</span>
              <ChevronIcon />
            </button>

            {calendarOpen && (
              <>
                <div
                  className="hist-calendar-backdrop"
                  onClick={() => setCalendarOpen(false)}
                />
                <div
                  className="hist-calendar-popover"
                  role="dialog"
                  aria-label="Pick a date"
                >
                  <div className="mini-calendar-header">
                    <button
                      className="mini-cal-nav"
                      onClick={() => changeMonth(-1)}
                      aria-label="Previous month"
                    >
                      ‹
                    </button>
                    <span>
                      {MONTH_NAMES[calendarMonth.getMonth()]}{" "}
                      {calendarMonth.getFullYear()}
                    </span>
                    <button
                      className="mini-cal-nav"
                      onClick={() => changeMonth(1)}
                      aria-label="Next month"
                    >
                      ›
                    </button>
                  </div>

                  <div className="mini-calendar-grid mini-calendar-labels">
                    {DAY_LABELS.map((d) => (
                      <span key={d}>{d}</span>
                    ))}
                  </div>

                  <div className="mini-calendar-grid">
                    {calendarDays.map((cell, i) => (
                      <button
                        key={i}
                        className={[
                          "mini-cal-day",
                          !cell.inMonth ? "muted" : "",
                          sameDay(cell.date, todayDate) ? "today" : "",
                          sameDay(cell.date, selectedDate) ? "selected" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => handlePickDate(cell.date)}
                        aria-label={cell.date.toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      >
                        {cell.day}
                      </button>
                    ))}
                  </div>

                  <button
                    className="mini-cal-today"
                    onClick={handleJumpToToday}
                  >
                    Jump to today
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <section className="hist-card">
          <div className="hist-card-head">
            <div>
              <p className="hist-card-title">Transactions</p>
              <p className="hist-card-sub">{dateLabel}</p>
            </div>
            {dayTransactions.length > 0 && (
              <span className="hist-day-summary">
                {dayTransactions.length}{" "}
                {dayTransactions.length === 1 ? "transaction" : "transactions"}{" "}
                · {formatCurrency(daySales)}
              </span>
            )}
          </div>

          {dayTransactions.length === 0 ? (
            <div className="queue-empty">
              <span className="queue-empty-icon">
                <ClockIcon />
              </span>
              <p className="queue-empty-title">
                {transactionList.length === 0
                  ? "No transactions yet"
                  : "No transactions on this date"}
              </p>
              <p className="queue-empty-sub">
                {transactionList.length === 0
                  ? "Completed bookings will show up here."
                  : "Pick another date to see other days."}
              </p>
            </div>
          ) : (
            <div className="hist-table-wrap">
              <table className="hist-table">
                <thead>
                  <tr>
                    <th>Services &amp; Transactions</th>
                    <th>Barber</th>
                    <th className="hist-center">Total</th>
                    <th className="hist-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {dayTransactions.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div className="hist-chips">
                          {(t.services || []).map((s) => (
                            <span key={s} className="hist-chip">
                              {s}
                            </span>
                          ))}
                        </div>
                        <div className="hist-time">
                          {new Date(t.date).toLocaleString("en-US", {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </div>
                      </td>
                      <td>
                        <div className="hist-barber">
                          <span className="avatar">
                            {(t.barberName || "?").charAt(0).toUpperCase()}
                          </span>
                          {t.barberName}
                        </div>
                      </td>
                      <td className="hist-center">
                        <span className="hist-amount">
                          {formatCurrency(t.amount)}
                        </span>
                        {t.method && (
                          <span className="hist-method">
                            {methodLabel(t.method)}
                          </span>
                        )}
                      </td>
                      <td className="hist-right">
                        <button
                          className="hist-void"
                          onClick={() => setVoidingId(t.id)}
                        >
                          <BanIcon size={15} />
                          Void
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <VoidModal
        isOpen={voidingTransaction !== null}
        transaction={voidingTransaction}
        dutyLabel={dutyLabel}
        onBack={() => setVoidingId(null)}
        onConfirm={handleVoidConfirm}
      />
    </div>
  );
}

/* ------------------------------ Void modal ------------------------------ */

function VoidModal({ isOpen, transaction, dutyLabel, onBack, onConfirm }) {
  const [reason, setReason] = useState(null);

  if (!isOpen || !transaction) return null;

  const handleClose = () => {
    setReason(null);
    onBack();
  };

  const handleVoid = () => {
    if (!reason) return;
    onConfirm(reason);
    setReason(null);
  };

  const now = new Date().toLocaleString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return createPortal(
    <div className="hist-overlay" onClick={handleClose}>
      <div
        className="hist-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hist-void-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hist-modal-head">
          <span className="hist-danger-icon">
            <BanIcon size={22} />
          </span>
          <div>
            <h2 id="hist-void-title">Void Transaction</h2>
            <p className="hist-modal-sub">
              On duty: {dutyLabel} · {now}
            </p>
          </div>
        </div>

        <div className="hist-void-summary">
          <div className="hist-void-summary-text">
            <strong>
              {(transaction.services || []).join(", ") || "Transaction"}
            </strong>
            <span>{transaction.barberName}</span>
          </div>
          <strong className="hist-void-amount">
            {formatCurrency(transaction.amount)}
          </strong>
        </div>

        <p className="hist-reason-label">Reason for void</p>
        <div className="hist-reasons">
          {VOID_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              className={`hist-reason ${reason === r ? "selected" : ""}`}
              aria-pressed={reason === r}
              onClick={() => setReason(r)}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="hist-modal-actions">
          <button
            type="button"
            className="hist-btn secondary"
            onClick={handleClose}
          >
            Back
          </button>
          <button
            type="button"
            className="hist-btn danger"
            onClick={handleVoid}
            disabled={!reason}
          >
            Void
          </button>
        </div>
      </div>
    </div>,
    document.body,
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

function ReceiptIcon() {
  return (
    <Svg>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6" />
    </Svg>
  );
}

function CalendarIcon() {
  return (
    <Svg size={18}>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M8 3v3M16 3v3M4 10h16" />
    </Svg>
  );
}

function ChevronIcon() {
  return (
    <Svg size={14}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

function ClockIcon() {
  return (
    <Svg size={26}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  );
}

function BanIcon({ size = 18 }) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="9" />
      <path d="m6 6 12 12" />
    </Svg>
  );
}

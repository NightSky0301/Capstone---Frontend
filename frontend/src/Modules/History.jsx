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

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function History({ onLogout, onNavigate }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [transactionList, setTransactionList] = useState(initialTransactions);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [voidingId, setVoidingId] = useState(null);

  const dayTransactions = useMemo(
    () =>
      transactionList.filter((t) => sameDay(new Date(t.date), selectedDate)),
    [transactionList, selectedDate],
  );

  const totalTransaction = transactionList.length;
  const totalSales = useMemo(
    () => transactionList.reduce((sum, t) => sum + t.amount, 0),
    [transactionList],
  );

  const formatCurrency = (n) => `\u20b1${n.toLocaleString()}`;

  const dateLabel = selectedDate.toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });

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

  const handlePickDate = (date) => {
    setSelectedDate(date);
    setCalendarOpen(false);
  };

  const handleVoidConfirm = (reason) => {
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
            <h1 className="dashboard-title">History Transactions</h1>
          </div>
        </div>

        <div className="history-top-row">
          <StatCard label="Total Transaction" value={totalTransaction} />
          <StatCard label="Sales" value={formatCurrency(totalSales)} />

          <div className="history-calendar-wrap">
            <button
              className="history-calendar-button"
              onClick={() => setCalendarOpen((v) => !v)}
              aria-label="Pick a date"
            >
              <CalendarIcon />
            </button>
            {calendarOpen && (
              <div className="history-calendar-popover">
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
                        sameDay(cell.date, selectedDate) ? "selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => handlePickDate(cell.date)}
                    >
                      {cell.day}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="history-date-label">{dateLabel}</p>

        <div className="history-card">
          <table className="history-table">
            <thead>
              <tr>
                <th>Services &amp; Transactions</th>
                <th>Barber</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dayTransactions.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div className="services-cell-main">
                      {t.services.join(", ")}
                    </div>
                    <div className="services-cell-sub">
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
                  <td className="barber-name-cell">{t.barberName}</td>
                  <td className="total-cell">{formatCurrency(t.amount)}</td>
                  <td>
                    <button
                      className="void-button"
                      onClick={() => setVoidingId(t.id)}
                    >
                      Void
                    </button>
                  </td>
                </tr>
              ))}
              {dayTransactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="no-history-cell">
                    No transactions on this date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      <VoidModal
        isOpen={voidingTransaction !== null}
        transaction={voidingTransaction}
        onBack={() => setVoidingId(null)}
        onConfirm={handleVoidConfirm}
      />
    </div>
  );
}

function VoidModal({ isOpen, transaction, onBack, onConfirm }) {
  const [reason, setReason] = useState(null);

  if (!isOpen) return null;

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
    <div className="history-overlay" onClick={handleClose}>
      <div className="void-modal" onClick={(e) => e.stopPropagation()}>
        <div className="void-modal-header">
          <h2>Void</h2>
          <div className="void-modal-meta">
            <p>On Duty: Cashier</p>
            <p>{now}</p>
          </div>
        </div>

        <p className="void-reason-label">Reason for Void:</p>
        <div className="void-reason-row">
          {VOID_REASONS.map((r) => (
            <button
              key={r}
              className={`void-reason-button ${reason === r ? "selected" : ""}`}
              onClick={() => setReason(r)}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="void-modal-actions">
          <button className="void-back-button" onClick={handleClose}>
            Back
          </button>
          <button
            className="void-confirm-button"
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

function CalendarIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M8 3v3M16 3v3" strokeLinecap="round" />
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M4 10h16" />
      <path
        d="M7 14h.01M11 14h.01M15 14h.01M7 17h.01M11 17h.01M15 17h.01"
        strokeLinecap="round"
      />
    </svg>
  );
}

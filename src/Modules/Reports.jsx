import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { initialBarbers, transactions } from "./mockData";
import "../Css/Dashboard.css";
import "../Css/Reports.css";

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

// Barbers earn this share of their gross sales.
const COMMISSION_RATE = 0.5;
const COMMISSION_LABEL = `${Math.round(COMMISSION_RATE * 100)}% Commission`;

const PAGE_SIZE = 5; // barbers shown per page

const PRINT_OPTIONS = [
  { label: "Monthly Report", period: "monthly", individual: false },
  { label: "Daily Report", period: "daily", individual: false },
  { label: "Individual Report (Daily)", period: "daily", individual: true },
  {
    label: "Individual Report (Monthly)",
    period: "monthly",
    individual: true,
  },
];

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

const formatCurrency = (n) => `\u20b1${n.toLocaleString()}`;

export default function Reports({ onLogout, onNavigate, role }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [period, setPeriod] = useState("daily"); // 'daily' | 'monthly'
  const [printMenuOpen, setPrintMenuOpen] = useState(false); // print popup
  const [pickerPeriod, setPickerPeriod] = useState(null); // opens barber picker
  const [printBarberId, setPrintBarberId] = useState(null);
  const [page, setPage] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);

  // Daily report -> the selected date. Monthly report -> the month the
  // calendar is currently showing.
  const reportRows = useMemo(() => {
    return initialBarbers.map((barber) => {
      const periodTransactions = transactions.filter((t) => {
        if (t.barberId !== barber.id) return false;
        const d = new Date(t.date);
        return period === "daily"
          ? sameDay(d, selectedDate)
          : sameMonth(d, calendarMonth);
      });

      const onlineAmount = periodTransactions
        .filter((t) => t.method !== "cash")
        .reduce((sum, t) => sum + t.amount, 0);
      const grossSale = periodTransactions.reduce(
        (sum, t) => sum + t.amount,
        0,
      );

      return {
        id: barber.id,
        name: barber.name,
        heads: periodTransactions.length,
        onlineTransac: onlineAmount,
        grossSale,
        commission: Math.round(grossSale * COMMISSION_RATE),
      };
    });
  }, [selectedDate, calendarMonth, period]);

  // While printing an individual report, only that barber is shown.
  const visibleRows =
    printBarberId !== null
      ? reportRows.filter((r) => r.id === printBarberId)
      : reportRows;

  // Pagination (when printing, every row is included)
  const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = isPrinting
    ? visibleRows
    : visibleRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart =
    visibleRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, visibleRows.length);

  const totals = useMemo(
    () =>
      visibleRows.reduce(
        (acc, row) => ({
          heads: acc.heads + row.heads,
          onlineTransac: acc.onlineTransac + row.onlineTransac,
          grossSale: acc.grossSale + row.grossSale,
          commission: acc.commission + row.commission,
        }),
        { heads: 0, onlineTransac: 0, grossSale: 0, commission: 0 },
      ),
    [visibleRows],
  );

  const periodName = period === "daily" ? "Daily" : "Monthly";
  const periodLabel =
    period === "daily"
      ? selectedDate.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : `${MONTH_NAMES[calendarMonth.getMonth()]} ${calendarMonth.getFullYear()}`;

  const printBarber =
    initialBarbers.find((b) => b.id === printBarberId) || null;
  const printTitle = printBarber
    ? `Individual Report (${periodName})`
    : `${periodName} Report`;

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

  // Every handler that changes the period or date also sends the table
  // back to page 1.
  const changeMonth = (delta) => {
    setCalendarMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1),
    );
    setPage(1);
  };

  const pickDate = (date) => {
    setSelectedDate(date);
    if (!sameMonth(date, calendarMonth)) setCalendarMonth(date);
    setPage(1);
  };

  const jumpToToday = () => {
    const now = new Date();
    setSelectedDate(now);
    setCalendarMonth(now);
    setPage(1);
  };

  // After the print dialog closes, go back to showing every barber.
  useEffect(() => {
    const reset = () => {
      setPrintBarberId(null);
      setIsPrinting(false);
    };
    window.addEventListener("afterprint", reset);
    return () => window.removeEventListener("afterprint", reset);
  }, []);

  const startPrint = (nextPeriod, barberId = null) => {
    setIsPrinting(true);
    setPeriod(nextPeriod);
    setPrintBarberId(barberId);
    setPrintMenuOpen(false);
    setPickerPeriod(null);
    // Give the page a moment to re-render with the right period/barber.
    setTimeout(() => window.print(), 150);
  };

  const handlePrintOption = (option) => {
    if (option.individual) {
      setPrintMenuOpen(false);
      setPickerPeriod(option.period);
    } else {
      startPrint(option.period);
    }
  };

  return (
    <div className="dashboard-root reports-page">
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
            <h1 className="dashboard-title">
              REPORT <span className="dashboard-date">{periodLabel}</span>
            </h1>
          </div>
        </div>

        {/* Only visible on the printed page */}
        <div className="print-only">
          <h2>People's Barbershop</h2>
          <p>
            {printTitle} · {periodLabel}
          </p>
          {printBarber && <p>Barber: {printBarber.name}</p>}
        </div>

        <div className="report-layout">
          <section className="report-card">
            <div className="report-card-head">
              <p className="report-card-title">{periodName} sales</p>
              <div
                className="period-toggle"
                role="group"
                aria-label="Report period"
              >
                <button
                  type="button"
                  className={period === "daily" ? "active" : ""}
                  aria-pressed={period === "daily"}
                  onClick={() => {
                    setPeriod("daily");
                    setPage(1);
                  }}
                >
                  Daily
                </button>
                <button
                  type="button"
                  className={period === "monthly" ? "active" : ""}
                  aria-pressed={period === "monthly"}
                  onClick={() => {
                    setPeriod("monthly");
                    setPage(1);
                  }}
                >
                  Monthly
                </button>
              </div>
            </div>

            {initialBarbers.length === 0 ? (
              <div className="queue-empty">
                <span className="queue-empty-icon">
                  <ChartIcon />
                </span>
                <p className="queue-empty-title">No report data yet</p>
                <p className="queue-empty-sub">
                  Barber sales will show up here once barbers and transactions
                  are added.
                </p>
              </div>
            ) : (
              <>
                <div className="report-table-wrap">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th className="report-th-name">Barber</th>
                        <th>Heads</th>
                        <th>Online Transac</th>
                        <th>Gross Sale</th>
                        <th>{COMMISSION_LABEL}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedRows.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <div className="barber-cell">
                              <span className="avatar">
                                {row.name.charAt(0).toUpperCase()}
                              </span>
                              {row.name}
                            </div>
                          </td>
                          <td>
                            <span className="report-pill">{row.heads}</span>
                          </td>
                          <td>
                            <span className="report-pill">
                              {formatCurrency(row.onlineTransac)}
                            </span>
                          </td>
                          <td>
                            <span className="report-pill money">
                              {formatCurrency(row.grossSale)}
                            </span>
                          </td>
                          <td>
                            <span className="report-pill commission">
                              {formatCurrency(row.commission)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="report-total-row">
                        <td>Total</td>
                        <td>{totals.heads}</td>
                        <td>{formatCurrency(totals.onlineTransac)}</td>
                        <td>{formatCurrency(totals.grossSale)}</td>
                        <td>{formatCurrency(totals.commission)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="report-pagination">
                  <span className="report-page-info">
                    Showing {rangeStart}–{rangeEnd} of {visibleRows.length}
                  </span>

                  <div className="report-page-controls">
                    <button
                      className="report-page-btn"
                      onClick={() => setPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      aria-label="Previous page"
                    >
                      ‹
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (n) => (
                        <button
                          key={n}
                          className={`report-page-btn ${
                            n === currentPage ? "active" : ""
                          }`}
                          onClick={() => setPage(n)}
                          aria-current={n === currentPage ? "page" : undefined}
                        >
                          {n}
                        </button>
                      ),
                    )}

                    <button
                      className="report-page-btn"
                      onClick={() => setPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      aria-label="Next page"
                    >
                      ›
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>

          <aside className="report-side">
            <div className="mini-calendar">
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
                    onClick={() => pickDate(cell.date)}
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

              <button className="mini-cal-today" onClick={jumpToToday}>
                Jump to today
              </button>
            </div>

            <button
              className="print-button"
              onClick={() => setPrintMenuOpen(true)}
              aria-haspopup="dialog"
            >
              <PrintIcon />
              Print
            </button>
          </aside>
        </div>
      </main>

      <PrintModal
        isOpen={printMenuOpen}
        options={PRINT_OPTIONS}
        onSelect={handlePrintOption}
        onClose={() => setPrintMenuOpen(false)}
      />

      <BarberPickerModal
        period={pickerPeriod}
        barbers={initialBarbers}
        onPick={(barberId) => startPrint(pickerPeriod, barberId)}
        onClose={() => setPickerPeriod(null)}
      />
    </div>
  );
}

/* ------------------------------ Modals ------------------------------ */

function PrintModal({ isOpen, options, onSelect, onClose }) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="rep-overlay" onClick={onClose}>
      <div
        className="rep-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rep-print-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="rep-print-title">Print Report</h2>
        <p className="rep-modal-sub">Choose which report you want to print.</p>

        <div className="rep-barber-list">
          {options.map((option, i) => (
            <div key={option.label}>
              {i === 2 && <div className="rep-option-divider" />}
              <button
                className="rep-barber-item"
                onClick={() => onSelect(option)}
              >
                <span className="rep-option-icon">
                  <PrintIcon />
                </span>
                <span>{option.label}</span>
              </button>
            </div>
          ))}
        </div>

        <div className="rep-modal-actions">
          <button className="rep-btn" onClick={onClose}>
            Back
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function BarberPickerModal({ period, barbers, onPick, onClose }) {
  if (!period) return null;

  return createPortal(
    <div className="rep-overlay" onClick={onClose}>
      <div
        className="rep-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rep-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="rep-picker-title">Individual Report</h2>
        <p className="rep-modal-sub">
          {period === "daily" ? "Daily" : "Monthly"} · choose a barber to print
        </p>

        {barbers.length === 0 ? (
          <p className="rep-modal-empty">No barbers available yet.</p>
        ) : (
          <div className="rep-barber-list">
            {barbers.map((barber) => (
              <button
                key={barber.id}
                className="rep-barber-item"
                onClick={() => onPick(barber.id)}
              >
                <span className="avatar">
                  {barber.name.charAt(0).toUpperCase()}
                </span>
                <span>{barber.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="rep-modal-actions">
          <button className="rep-btn" onClick={onClose}>
            Back
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function PrintIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9V3h12v6" />
      <rect x="4" y="9" width="16" height="8" rx="1.5" />
      <path d="M6 14h12v7H6z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
    </svg>
  );
}

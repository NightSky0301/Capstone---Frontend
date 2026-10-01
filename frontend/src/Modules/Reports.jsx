import { useState, useMemo } from "react";
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

const PRINT_OPTIONS = [
  "Monthly Report",
  "Daily Report",
  "Individual Report (Daily)",
  "Individual Report (Monthly)",
];

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function Reports({ onLogout, onNavigate }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [printMenuOpen, setPrintMenuOpen] = useState(false);

  const reportRows = useMemo(() => {
    return initialBarbers.map((barber) => {
      const dayTransactions = transactions.filter(
        (t) =>
          t.barberId === barber.id && sameDay(new Date(t.date), selectedDate),
      );
      const onlineTransac = dayTransactions.filter((t) => t.method !== "cash");
      const grossSale = dayTransactions.reduce((sum, t) => sum + t.amount, 0);

      return {
        id: barber.id,
        name: barber.name,
        heads: dayTransactions.length,
        onlineTransac: onlineTransac.length,
        grossSale,
        commission: Math.round(grossSale * 0.5),
      };
    });
  }, [selectedDate]);

  const totals = useMemo(
    () =>
      reportRows.reduce(
        (acc, row) => ({
          heads: acc.heads + row.heads,
          onlineTransac: acc.onlineTransac + row.onlineTransac,
          grossSale: acc.grossSale + row.grossSale,
          commission: acc.commission + row.commission,
        }),
        { heads: 0, onlineTransac: 0, grossSale: 0, commission: 0 },
      ),
    [reportRows],
  );

  const formatCurrency = (n) => `\u20b1${n.toLocaleString()}`;

  const dateLabel = selectedDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
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

  const handlePrintOption = (label) => {
    setPrintMenuOpen(false);
    alert(`Wire this up to your real "${label}" export/print logic`);
  };

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
            <h1 className="dashboard-title">
              REPORT <span className="dashboard-date">{dateLabel}</span>
            </h1>
          </div>
        </div>

        <div className="report-panel">
          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th className="report-th-name">Barber</th>
                  <th>Heads</th>
                  <th>Online Transac</th>
                  <th>Gross Sale</th>
                  <th>50% Commission</th>
                </tr>
              </thead>
              <tbody>
                {reportRows.map((row) => (
                  <tr key={row.id}>
                    <td className="report-name-cell">{row.name}</td>
                    <td>
                      <span className="report-pill">{row.heads}</span>
                    </td>
                    <td>
                      <span className="report-pill">{row.onlineTransac}</span>
                    </td>
                    <td>
                      <span className="report-pill">
                        {formatCurrency(row.grossSale)}
                      </span>
                    </td>
                    <td>
                      <span className="report-pill">
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

          <div className="report-side">
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
                      sameDay(cell.date, selectedDate) ? "selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setSelectedDate(cell.date)}
                  >
                    {cell.day}
                  </button>
                ))}
              </div>
            </div>

            <div className="print-wrap">
              <button
                className="print-button"
                onClick={() => setPrintMenuOpen((v) => !v)}
              >
                Print <PrintIcon />
              </button>
              {printMenuOpen && (
                <div className="print-menu">
                  {PRINT_OPTIONS.map((label) => (
                    <button
                      key={label}
                      className="print-menu-item"
                      onClick={() => handlePrintOption(label)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <button className="see-more-button" disabled>
          See More
        </button>
      </main>
    </div>
  );
}

function PrintIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M6 9V3h12v6" />
      <rect x="4" y="9" width="16" height="8" rx="1.5" />
      <path d="M6 14h12v7H6z" />
    </svg>
  );
}

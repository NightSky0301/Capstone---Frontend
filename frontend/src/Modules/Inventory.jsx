import { useState, useMemo } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import StatCard from "./Statcard";
import { inventoryItems, criticalStockThreshold } from "./mockData";
import "../Css/Dashboard.css";
import "../Css/Inventory.css";

export default function Inventory({ onLogout, onNavigate }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");

  const totalItems = useMemo(
    () => inventoryItems.reduce((sum, item) => sum + item.unit, 0),
    [],
  );

  const criticalItems = useMemo(
    () => inventoryItems.filter((item) => item.unit <= criticalStockThreshold),
    [],
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return inventoryItems;
    return inventoryItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q),
    );
  }, [search]);

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

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
              INVENTORY <span className="dashboard-date">{today}</span>
            </h1>
          </div>
        </div>

        <div className="inventory-top-row">
          <StatCard label="Total Items" value={totalItems} />

          <div className="critical-stocks-card">
            <p className="critical-stocks-title">Critical Stocks</p>
            <p className="critical-stocks-body">
              {criticalItems.length === 0
                ? "None"
                : criticalItems.map((item) => item.name).join(", ")}
            </p>
          </div>

          <div className="inventory-actions">
            <div className="search-box">
              <label htmlFor="inventory-search" className="search-label">
                Search Item
              </label>
              <input
                id="inventory-search"
                type="text"
                placeholder="Item Name/ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              className="add-product-button"
              onClick={() =>
                alert("Wire this up to your real add-product flow")
              }
            >
              Add Product
            </button>
          </div>
        </div>

        <div className="queue-table-scroll inventory-table-scroll">
          <table className="queue-table inventory-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Item Name</th>
                <th>Category</th>
                <th>
                  Current Stock
                  <br />
                  Unit/Box
                </th>
                <th>Used Today</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const isCritical = item.unit <= criticalStockThreshold;
                return (
                  <tr key={item.id}>
                    <td className="item-id-cell">{item.id}</td>
                    <td className="item-name-cell">{item.name}</td>
                    <td>{item.category}</td>
                    <td className="stock-cell">
                      {item.unit} / {item.box}
                    </td>
                    <td className="used-cell">{item.usedToday}</td>
                    <td>
                      <span
                        className={`status-pill ${isCritical ? "critical" : "ok"}`}
                      >
                        {isCritical ? "Low Stock" : "In Stock"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="add-stock-button"
                        onClick={() =>
                          alert("Wire this up to your real add-stock flow")
                        }
                      >
                        Add Stock
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="no-results-cell">
                    No items match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

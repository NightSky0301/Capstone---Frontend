import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import StatCard from "./Statcard";
import {
  inventoryItems as initialItems,
  criticalStockThreshold,
} from "./mockData";
import "../Css/Dashboard.css";
import "../Css/Inventory.css";

const DEFAULT_CATEGORIES = ["Supplies", "Garment"];
const MAX_CRITICAL_CHIPS = 5;

// Turns a text input into a whole number >= 0. Empty counts as 0,
// anything invalid returns NaN.
const parseCount = (value) => {
  const trimmed = value.trim();
  if (trimmed === "") return 0;
  const n = Number(trimmed);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
};

export default function Inventory({ onLogout, onNavigate, role }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [stockTargetId, setStockTargetId] = useState(null);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.unit, 0),
    [items],
  );

  const criticalItems = useMemo(
    () => items.filter((item) => item.unit <= criticalStockThreshold),
    [items],
  );

  const itemCategories = useMemo(
    () => [...new Set(items.map((item) => item.category))],
    [items],
  );

  // Suggestions for the Add Product category field.
  const categorySuggestions = useMemo(
    () => [...new Set([...DEFAULT_CATEGORIES, ...itemCategories])],
    [itemCategories],
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q);
      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, categoryFilter]);

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const nextProductId = () => {
    const max = items.reduce((m, item) => {
      const n = parseInt(String(item.id).replace(/\D/g, ""), 10);
      return Number.isNaN(n) ? m : Math.max(m, n);
    }, 0);
    return `PROD-${String(max + 1).padStart(3, "0")}`;
  };

  const handleAddProduct = ({ name, category, unit, box }) => {
    setItems((prev) => [
      ...prev,
      { id: nextProductId(), name, category, unit, box, usedToday: 0 },
    ]);
    setAddProductOpen(false);
  };

  const handleAddStock = (addUnit, addBox) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === stockTargetId
          ? { ...item, unit: item.unit + addUnit, box: item.box + addBox }
          : item,
      ),
    );
    setStockTargetId(null);
  };

  const stockTarget = items.find((item) => item.id === stockTargetId) || null;

  const shownCritical = criticalItems.slice(0, MAX_CRITICAL_CHIPS);
  const extraCritical = criticalItems.length - shownCritical.length;

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
            <h1 className="dashboard-title">
              INVENTORY <span className="dashboard-date">{today}</span>
            </h1>
          </div>
        </div>

        <div className="inv-summary-row">
          <StatCard icon={<BoxIcon />} label="Total Items" value={totalItems} />

          <div className="inv-critical-card">
            <span
              className={`inv-critical-icon ${criticalItems.length > 0 ? "alert" : "ok"}`}
            >
              {criticalItems.length > 0 ? <WarningIcon /> : <CheckIcon />}
            </span>
            <div className="inv-critical-body">
              <p
                className={`inv-critical-title ${criticalItems.length > 0 ? "" : "ok"}`}
              >
                Critical Stocks
              </p>
              {criticalItems.length === 0 ? (
                <p className="inv-critical-ok-text">
                  All items are sufficiently stocked
                </p>
              ) : (
                <div className="inv-critical-chips">
                  {shownCritical.map((item) => (
                    <span key={item.id} className="inv-chip">
                      {item.name}
                    </span>
                  ))}
                  {extraCritical > 0 && (
                    <span className="inv-chip more">+{extraCritical} more</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="inv-toolbar">
          <div className="inv-search">
            <span className="inv-search-icon">
              <SearchIcon />
            </span>
            <input
              id="inventory-search"
              type="text"
              placeholder="Search by item name or ID"
              aria-label="Search items"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="inv-select"
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All categories</option>
            {itemCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <button
            className="inv-add-product"
            onClick={() => setAddProductOpen(true)}
          >
            <PlusIcon />
            Add Product
          </button>
        </div>

        <div className="queue-table-scroll inventory-table-scroll">
          {filteredItems.length === 0 ? (
            <div className="queue-empty">
              <span className="queue-empty-icon">
                {items.length === 0 ? <BoxIcon /> : <SearchIcon />}
              </span>
              <p className="queue-empty-title">
                {items.length === 0 ? "No items yet" : "No items match"}
              </p>
              <p className="queue-empty-sub">
                {items.length === 0
                  ? "Add your first product to start tracking stock."
                  : "Try a different search or category."}
              </p>
              {items.length === 0 && (
                <button
                  className="inv-add-product"
                  onClick={() => setAddProductOpen(true)}
                >
                  <PlusIcon />
                  Add Product
                </button>
              )}
            </div>
          ) : (
            <table className="queue-table inventory-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th className="inv-center">
                    Current Stock
                    <span className="inv-th-sub">Unit / Box</span>
                  </th>
                  <th className="inv-center">Used Today</th>
                  <th className="inv-center">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isCritical = item.unit <= criticalStockThreshold;
                  return (
                    <tr
                      key={item.id}
                      className={isCritical ? "inv-row-critical" : ""}
                    >
                      <td>
                        <span className="inv-id">{item.id}</span>
                      </td>
                      <td>
                        <span className="inv-name">{item.name}</span>
                      </td>
                      <td>
                        <span className="inv-tag">{item.category}</span>
                      </td>
                      <td className="inv-center">
                        <span className="inv-stock">
                          <strong>{item.unit}</strong>
                          <span className="inv-stock-sep">/</span>
                          {item.box}
                        </span>
                      </td>
                      <td className="inv-center">
                        <span className="inv-used">{item.usedToday}</span>
                      </td>
                      <td className="inv-center">
                        <span
                          className={`inv-status ${isCritical ? "critical" : "ok"}`}
                        >
                          {isCritical ? "Low Stock" : "In Stock"}
                        </span>
                      </td>
                      <td className="inv-right">
                        <button
                          className="inv-add-stock"
                          onClick={() => setStockTargetId(item.id)}
                        >
                          Add Stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>

      <AddProductModal
        isOpen={addProductOpen}
        categories={categorySuggestions}
        onClose={() => setAddProductOpen(false)}
        onConfirm={handleAddProduct}
      />

      <AddStockModal
        isOpen={stockTarget !== null}
        item={stockTarget}
        onClose={() => setStockTargetId(null)}
        onConfirm={handleAddStock}
      />
    </div>
  );
}

/* ------------------------------ Modals ------------------------------ */

function AddProductModal({ isOpen, categories, onClose, onConfirm }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [box, setBox] = useState("");

  if (!isOpen) return null;

  const unitCount = parseCount(unit);
  const boxCount = parseCount(box);
  const isValid =
    name.trim() !== "" &&
    category.trim() !== "" &&
    !Number.isNaN(unitCount) &&
    !Number.isNaN(boxCount);

  const reset = () => {
    setName("");
    setCategory("");
    setUnit("");
    setBox("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    onConfirm({
      name: name.trim(),
      category: category.trim(),
      unit: unitCount,
      box: boxCount,
    });
    reset();
  };

  return createPortal(
    <div className="inv-overlay" onClick={handleClose}>
      <form
        className="inv-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inv-add-product-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        noValidate
      >
        <h2 id="inv-add-product-title">Add Product</h2>
        <p className="inv-modal-sub">Create a new inventory item.</p>

        <label className="inv-field">
          <span>Item name</span>
          <input
            type="text"
            placeholder="e.g. Hair Color"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>

        <label className="inv-field">
          <span>Category</span>
          <input
            type="text"
            list="inv-category-options"
            placeholder="e.g. Supplies"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <datalist id="inv-category-options">
            {categories.map((cat) => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
        </label>

        <div className="inv-field-row">
          <label className="inv-field">
            <span>Starting units</span>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              placeholder="0"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </label>
          <label className="inv-field">
            <span>Starting boxes</span>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              placeholder="0"
              value={box}
              onChange={(e) => setBox(e.target.value)}
            />
          </label>
        </div>

        <div className="inv-modal-actions">
          <button
            type="button"
            className="inv-btn secondary"
            onClick={handleClose}
          >
            Back
          </button>
          <button type="submit" className="inv-btn primary" disabled={!isValid}>
            Add Product
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

function AddStockModal({ isOpen, item, onClose, onConfirm }) {
  const [addUnit, setAddUnit] = useState("");
  const [addBox, setAddBox] = useState("");

  if (!isOpen || !item) return null;

  const unitCount = parseCount(addUnit);
  const boxCount = parseCount(addBox);
  const isValid =
    !Number.isNaN(unitCount) &&
    !Number.isNaN(boxCount) &&
    unitCount + boxCount > 0;

  const reset = () => {
    setAddUnit("");
    setAddBox("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    onConfirm(unitCount, boxCount);
    reset();
  };

  const newUnit = item.unit + (Number.isNaN(unitCount) ? 0 : unitCount);
  const newBox = item.box + (Number.isNaN(boxCount) ? 0 : boxCount);

  return createPortal(
    <div className="inv-overlay" onClick={handleClose}>
      <form
        className="inv-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inv-add-stock-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        noValidate
      >
        <h2 id="inv-add-stock-title">Add Stock</h2>
        <p className="inv-modal-sub">
          {item.name} · {item.id}
        </p>

        <div className="inv-field-row">
          <label className="inv-field">
            <span>Units to add</span>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              placeholder="0"
              value={addUnit}
              onChange={(e) => setAddUnit(e.target.value)}
              autoFocus
            />
          </label>
          <label className="inv-field">
            <span>Boxes to add</span>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              placeholder="0"
              value={addBox}
              onChange={(e) => setAddBox(e.target.value)}
            />
          </label>
        </div>

        <div className="inv-preview">
          <span>
            Current: <strong>{item.unit}</strong> / {item.box}
          </span>
          <span>
            New: <strong>{newUnit}</strong> / {newBox}
          </span>
        </div>

        <div className="inv-modal-actions">
          <button
            type="button"
            className="inv-btn secondary"
            onClick={handleClose}
          >
            Back
          </button>
          <button type="submit" className="inv-btn primary" disabled={!isValid}>
            Confirm
          </button>
        </div>
      </form>
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

function BoxIcon() {
  return (
    <Svg>
      <path d="m4 7 8-4 8 4-8 4-8-4Z" />
      <path d="M4 7v10l8 4 8-4V7" />
      <path d="M12 11v10" />
    </Svg>
  );
}

function WarningIcon() {
  return (
    <Svg>
      <path d="M12 3.5 2.8 19.5h18.4L12 3.5Z" />
      <path d="M12 10v4.5" />
      <path d="M12 17.2h.01" />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.3 2.8 2.8L16 9.5" />
    </Svg>
  );
}

function SearchIcon() {
  return (
    <Svg size={18}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </Svg>
  );
}

function PlusIcon() {
  return (
    <Svg size={16}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

import { useState } from "react";
import { createPortal } from "react-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { services as initialServices } from "./mockData";
import "../Css/Dashboard.css";
import "../Css/ServiceManagement.css";

const formatPrice = (n) => `\u20b1${Number(n).toLocaleString()}`;

export default function ServiceManagement({ onLogout, onNavigate, role }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [serviceList, setServiceList] = useState(initialServices);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  const nextId = () =>
    serviceList.length === 0
      ? 1
      : Math.max(...serviceList.map((s) => s.id)) + 1;

  const handleAddService = (name, price) => {
    setServiceList((prev) => [...prev, { id: nextId(), name, price }]);
    setAddModalOpen(false);
  };

  const handleChangePrice = (newPrice) => {
    setServiceList((prev) =>
      prev.map((s) => (s.id === editingId ? { ...s, price: newPrice } : s)),
    );
    setEditingId(null);
  };

  const handleRemoveConfirm = () => {
    setServiceList((prev) => prev.filter((s) => s.id !== removingId));
    setRemovingId(null);
  };

  const editingService = serviceList.find((s) => s.id === editingId) || null;
  const removingService = serviceList.find((s) => s.id === removingId) || null;

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
            <h1 className="dashboard-title">Services Management</h1>
          </div>

          <button
            className="svc-add-button"
            onClick={() => setAddModalOpen(true)}
          >
            <PlusIcon />
            Add Services
          </button>
        </div>

        <section className="svc-card">
          {serviceList.length === 0 ? (
            <div className="queue-empty">
              <span className="queue-empty-icon">
                <ScissorsIcon size={26} />
              </span>
              <p className="queue-empty-title">No services yet</p>
              <p className="queue-empty-sub">
                Add your first service so it can be priced and offered.
              </p>
              <button
                className="svc-add-button"
                onClick={() => setAddModalOpen(true)}
              >
                <PlusIcon />
                Add Service
              </button>
            </div>
          ) : (
            <div className="svc-table-wrap">
              <table className="svc-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th className="svc-center">Price</th>
                    <th className="svc-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceList.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="svc-name">
                          <span className="svc-icon">
                            <ScissorsIcon />
                          </span>
                          {s.name}
                        </div>
                      </td>
                      <td className="svc-center">
                        <span className="svc-price">
                          {formatPrice(s.price)}
                        </span>
                      </td>
                      <td className="svc-right">
                        <div className="svc-actions">
                          <button
                            className="svc-edit"
                            onClick={() => setEditingId(s.id)}
                          >
                            <PencilIcon />
                            Edit
                          </button>
                          <button
                            className="svc-remove"
                            onClick={() => setRemovingId(s.id)}
                          >
                            <TrashIcon />
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <AddServiceModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onConfirm={handleAddService}
      />

      <ChangePriceModal
        isOpen={editingService !== null}
        service={editingService}
        onClose={() => setEditingId(null)}
        onConfirm={handleChangePrice}
      />

      <RemoveServiceModal
        isOpen={removingService !== null}
        service={removingService}
        onClose={() => setRemovingId(null)}
        onConfirm={handleRemoveConfirm}
      />
    </div>
  );
}

/* ------------------------------ Modals ------------------------------ */

function AddServiceModal({ isOpen, onClose, onConfirm }) {
  const [name, setName] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [basePrice, setBasePrice] = useState("");

  if (!isOpen) return null;

  const priceNumber = Number(basePrice);
  const isValid =
    name.trim() !== "" &&
    basePrice.trim() !== "" &&
    !Number.isNaN(priceNumber) &&
    priceNumber > 0;

  const reset = () => {
    setName("");
    setAdminPassword("");
    setShowPassword(false);
    setBasePrice("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    onConfirm(name.trim(), priceNumber);
    reset();
  };

  return createPortal(
    <div className="svc-overlay" onClick={handleClose}>
      <form
        className="svc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="svc-add-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        noValidate
      >
        <h2 id="svc-add-title">Add Service</h2>
        <p className="svc-modal-sub">Create a new service with a base price.</p>

        <label className="svc-field">
          <span>Service name</span>
          <input
            type="text"
            placeholder="e.g. Haircut"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>

        <label className="svc-field">
          <span>Admin password</span>
          <div className="svc-input-wrap">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Admin password"
              autoComplete="new-password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
            />
            <button
              type="button"
              className="svc-eye"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </label>

        <label className="svc-field">
          <span>Base price</span>
          <div className="svc-input-prefix">
            <span className="svc-prefix">₱</span>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
            />
          </div>
        </label>

        <div className="svc-modal-actions">
          <button
            type="button"
            className="svc-btn secondary"
            onClick={handleClose}
          >
            Back
          </button>
          <button type="submit" className="svc-btn primary" disabled={!isValid}>
            Add Service
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

function ChangePriceModal({ isOpen, service, onClose, onConfirm }) {
  const [value, setValue] = useState("");

  if (!isOpen || !service) return null;

  const priceNumber = Number(value);
  const isValid =
    value.trim() !== "" && !Number.isNaN(priceNumber) && priceNumber > 0;

  const handleClose = () => {
    setValue("");
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    onConfirm(priceNumber);
    setValue("");
  };

  return createPortal(
    <div className="svc-overlay" onClick={handleClose}>
      <form
        className="svc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="svc-price-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        noValidate
      >
        <h2 id="svc-price-title">Change Price</h2>
        <p className="svc-modal-sub">{service.name}</p>

        <div className="svc-current">
          <span>Current price</span>
          <strong>{formatPrice(service.price)}</strong>
        </div>

        <label className="svc-field">
          <span>New price</span>
          <div className="svc-input-prefix">
            <span className="svc-prefix">₱</span>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="Enter value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
          </div>
        </label>

        <div className="svc-modal-actions">
          <button
            type="button"
            className="svc-btn secondary"
            onClick={handleClose}
          >
            Back
          </button>
          <button type="submit" className="svc-btn primary" disabled={!isValid}>
            Confirm
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

function RemoveServiceModal({ isOpen, service, onClose, onConfirm }) {
  if (!isOpen || !service) return null;

  return createPortal(
    <div className="svc-overlay" onClick={onClose}>
      <div
        className="svc-modal svc-modal-center"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="svc-remove-title"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="svc-danger-icon">
          <TrashIcon size={24} />
        </span>
        <h2 id="svc-remove-title">Remove service?</h2>
        <p className="svc-modal-sub">
          “{service.name}” will be removed from the services list.
        </p>

        <div className="svc-modal-actions">
          <button type="button" className="svc-btn secondary" onClick={onClose}>
            Back
          </button>
          <button type="button" className="svc-btn danger" onClick={onConfirm}>
            Remove
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------ Icons ------------------------------ */

function Svg({ children, size = 18 }) {
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

function ScissorsIcon({ size = 20 }) {
  return (
    <Svg size={size}>
      <circle cx="6" cy="6" r="2.4" />
      <circle cx="6" cy="18" r="2.4" />
      <line x1="19" y1="4" x2="8" y2="14" />
      <line x1="8" y1="10" x2="19" y2="20" />
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

function PencilIcon() {
  return (
    <Svg size={15}>
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="m14.5 7.5 3 3" />
    </Svg>
  );
}

function TrashIcon({ size = 15 }) {
  return (
    <Svg size={size}>
      <path d="M4 7h16" />
      <path d="M9 7V4.5h6V7" />
      <path d="M6.5 7 7.5 20h9L17.5 7" />
      <path d="M10 11v5M14 11v5" />
    </Svg>
  );
}

function EyeIcon() {
  return (
    <Svg>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

function EyeOffIcon() {
  return (
    <Svg>
      <path d="M17.9 17.9A10.4 10.4 0 0 1 12 19c-6.4 0-10-7-10-7a17.6 17.6 0 0 1 4.1-5" />
      <path d="M9.9 5.2A9.7 9.7 0 0 1 12 5c6.4 0 10 7 10 7a17.7 17.7 0 0 1-2.2 3.2" />
      <path d="M14.1 14.1a3 3 0 1 1-4.2-4.2" />
      <path d="m2 2 20 20" />
    </Svg>
  );
}

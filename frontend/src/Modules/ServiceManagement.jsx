import { useState } from "react";
import { createPortal } from "react-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { services as initialServices } from "./mockData";
import "../Css/Dashboard.css";
import "../Css/ServiceManagement.css";

export default function ServiceManagement({ onLogout, onNavigate }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [serviceList, setServiceList] = useState(initialServices);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

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

  const handleRemove = (id) => {
    const target = serviceList.find((s) => s.id === id);
    if (!target) return;
    if (window.confirm(`Remove "${target.name}" from services?`)) {
      setServiceList((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const editingService = serviceList.find((s) => s.id === editingId) || null;

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
            <h1 className="dashboard-title">Services Management</h1>
          </div>
          <button
            className="add-services-button"
            onClick={() => setAddModalOpen(true)}
          >
            Add Services
          </button>
        </div>

        <div className="services-mgmt-card">
          <table className="services-mgmt-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Price</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {serviceList.map((s) => (
                <tr key={s.id}>
                  <td className="service-name-cell">{s.name}</td>
                  <td className="service-price-cell">{`\u20b1${s.price}`}</td>
                  <td className="service-action-cell">
                    <button
                      className="edit-service-button"
                      onClick={() => setEditingId(s.id)}
                    >
                      Edit
                    </button>
                    <button
                      className="remove-service-link"
                      onClick={() => handleRemove(s.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {serviceList.length === 0 && (
                <tr>
                  <td colSpan={3} className="no-services-cell">
                    No services yet — click "Add Services" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      <AddServiceModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onConfirm={handleAddService}
      />

      <ChangePriceModal
        isOpen={editingService !== null}
        currentPrice={editingService?.price}
        onClose={() => setEditingId(null)}
        onConfirm={handleChangePrice}
      />
    </div>
  );
}

function AddServiceModal({ isOpen, onClose, onConfirm }) {
  const [name, setName] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [basePrice, setBasePrice] = useState("");

  if (!isOpen) return null;

  const priceNumber = Number(basePrice);
  const isValid =
    name.trim() !== "" &&
    basePrice.trim() !== "" &&
    !Number.isNaN(priceNumber) &&
    priceNumber > 0;

  const handleClose = () => {
    setName("");
    setAdminPassword("");
    setBasePrice("");
    onClose();
  };

  const handleDone = () => {
    if (!isValid) return;
    onConfirm(name.trim(), priceNumber);
    setName("");
    setAdminPassword("");
    setBasePrice("");
  };

  return createPortal(
    <div className="services-mgmt-overlay" onClick={handleClose}>
      <div className="add-service-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add Service</h2>

        <input
          type="text"
          placeholder="Service Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="password"
          placeholder="Admin password"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
        />
        <input
          type="number"
          placeholder="Base Price"
          value={basePrice}
          onChange={(e) => setBasePrice(e.target.value)}
          min="0"
        />

        <div className="add-service-actions">
          <button className="back-service-button" onClick={handleClose}>
            Back
          </button>
          <button
            className="done-button"
            onClick={handleDone}
            disabled={!isValid}
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ChangePriceModal({ isOpen, currentPrice, onClose, onConfirm }) {
  const [value, setValue] = useState("");

  if (!isOpen) return null;

  const priceNumber = Number(value);
  const isValid =
    value.trim() !== "" && !Number.isNaN(priceNumber) && priceNumber > 0;

  const handleBack = () => {
    setValue("");
    onClose();
  };

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(priceNumber);
    setValue("");
  };

  return createPortal(
    <div className="services-mgmt-overlay" onClick={handleBack}>
      <div className="change-price-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Change Price</h2>
        <p className="current-price-note">
          Current: {currentPrice != null ? `\u20b1${currentPrice}` : "—"}
        </p>

        <input
          type="number"
          placeholder="Enter Value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          min="0"
        />

        <div className="change-price-actions">
          <button className="back-btn" onClick={handleBack}>
            Back
          </button>
          <button
            className="confirm-btn"
            onClick={handleConfirm}
            disabled={!isValid}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import "../Css/Dashboard.css";
import "../Css/ServiceManagement.css";

const API_URL = "http://localhost:3000/api";

// Sends a request to the backend with the JWT attached.
// Returns the JSON answer, or throws an Error with a readable message.
async function api(token, path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error("Cannot reach the server. Please try again.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Something went wrong. Please try again.");
  }
  return data;
}

export default function ServiceManagement({ onLogout, onNavigate, token }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [serviceList, setServiceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Loads the services from MySQL (through the API) when the page opens,
  // and again every time reloadKey changes (after add / edit / remove).
  useEffect(() => {
    let ignore = false;
    api(token, "/services")
      .then((data) => {
        if (ignore) return;
        setServiceList(data);
        setLoadError("");
      })
      .catch((err) => {
        if (!ignore) setLoadError(err.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [token, reloadKey]);

  const reloadServices = () => setReloadKey((k) => k + 1);

  // The modals catch the errors thrown here and show them to the user.
  const handleAddService = async (name, price, adminPassword) => {
    await api(token, "/services", {
      method: "POST",
      body: JSON.stringify({ name, price, adminPassword }),
    });
    setAddModalOpen(false);
    reloadServices();
  };

  const handleChangePrice = async (newPrice) => {
    await api(token, `/services/${editingId}`, {
      method: "PUT",
      body: JSON.stringify({ price: newPrice }),
    });
    setEditingId(null);
    reloadServices();
  };

  const handleRemove = async (id) => {
    const target = serviceList.find((s) => s.id === id);
    if (!target) return;
    if (window.confirm(`Remove "${target.name}" from services?`)) {
      try {
        await api(token, `/services/${id}`, { method: "DELETE" });
        reloadServices();
      } catch (err) {
        window.alert(err.message);
      }
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

        {loadError && (
          <p role="alert" style={{ color: "#b00020", margin: "0 0 12px" }}>
            {loadError}
          </p>
        )}

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
              {loading && (
                <tr>
                  <td colSpan={3} className="no-services-cell">
                    Loading services…
                  </td>
                </tr>
              )}
              {!loading && !loadError && serviceList.length === 0 && (
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
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const priceNumber = Number(basePrice);
  const isValid =
    name.trim() !== "" &&
    adminPassword !== "" &&
    basePrice.trim() !== "" &&
    !Number.isNaN(priceNumber) &&
    priceNumber > 0;

  const handleClose = () => {
    setName("");
    setAdminPassword("");
    setBasePrice("");
    setError("");
    onClose();
  };

  const handleDone = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onConfirm(name.trim(), priceNumber, adminPassword);
      setName("");
      setAdminPassword("");
      setBasePrice("");
    } catch (err) {
      setError(err.message);
      setAdminPassword("");
    } finally {
      setSubmitting(false);
    }
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

        {error && (
          <p role="alert" style={{ color: "#b00020", margin: "0" }}>
            {error}
          </p>
        )}

        <div className="add-service-actions">
          <button className="back-service-button" onClick={handleClose}>
            Back
          </button>
          <button
            className="done-button"
            onClick={handleDone}
            disabled={!isValid || submitting}
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
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const priceNumber = Number(value);
  const isValid =
    value.trim() !== "" && !Number.isNaN(priceNumber) && priceNumber > 0;

  const handleBack = () => {
    setValue("");
    setError("");
    onClose();
  };

  const handleConfirm = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onConfirm(priceNumber);
      setValue("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
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

        {error && (
          <p role="alert" style={{ color: "#b00020", margin: "0" }}>
            {error}
          </p>
        )}

        <div className="change-price-actions">
          <button className="back-btn" onClick={handleBack}>
            Back
          </button>
          <button
            className="confirm-btn"
            onClick={handleConfirm}
            disabled={!isValid || submitting}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
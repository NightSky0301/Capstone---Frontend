import { useState } from "react";
import { createPortal } from "react-dom";
import { services } from "./mockData";
import "../Css/Services.css";

export default function ServicesModal({ isOpen, onClose, onConfirm }) {
  const [selected, setSelected] = useState({});

  if (!isOpen) return null;

  const toggleService = (id) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const total = services
    .filter((s) => selected[s.id])
    .reduce((sum, s) => sum + s.price, 0);

  const handleConfirm = () => {
    onConfirm();
    setSelected({});
  };

  const handleClose = () => {
    setSelected({});
    onClose();
  };

  return createPortal(
    <div className="services-overlay" onClick={handleClose}>
      <div className="services-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="back-button"
          onClick={handleClose}
          aria-label="Close"
        >
          ←
        </button>
        <h2>Services</h2>

        <div className="services-list">
          {services.map((s) => (
            <label key={s.id} className="service-row">
              <input
                type="checkbox"
                checked={!!selected[s.id]}
                onChange={() => toggleService(s.id)}
              />
              <span className="service-name">{s.name}</span>
              <span className="service-price">₱{s.price}</span>
            </label>
          ))}
        </div>

        <div className="total-box">
          <span>Total</span>
          <span>₱{total}</span>
        </div>

        <div className="modal-actions">
          <button className="cancel-button" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="confirm-button"
            onClick={handleConfirm}
            disabled={total === 0}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

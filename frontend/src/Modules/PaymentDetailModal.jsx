import { useState } from "react";
import { createPortal } from "react-dom";
import "../Css/Payment.css";

const PROVIDER_LABELS = {
  gcash: "Gcash",
  paymaya: "Paymaya",
  qrph: "QRPH",
};

export default function PaymentDetailModal({
  isOpen,
  provider,
  onConfirm,
  onBack,
  onClose,
}) {
  const [refNo, setRefNo] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(refNo);
    setRefNo("");
  };

  return createPortal(
    <div className="payment-overlay" onClick={onClose}>
      <div
        className="payment-modal payment-detail-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{PROVIDER_LABELS[provider] || "Online Payment"}</h2>

        <div className="payment-detail-row">
          <input
            type="text"
            className="ref-input"
            placeholder="Enter Ref No."
            value={refNo}
            onChange={(e) => setRefNo(e.target.value)}
          />
          <div className="qr-placeholder">QR</div>
        </div>

        <div className="payment-small-actions">
          <button className="payment-small-button" onClick={onBack}>
            Back
          </button>
          <button
            className="payment-small-button"
            onClick={handleConfirm}
            disabled={refNo.trim() === ""}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

import { createPortal } from "react-dom";
import "../Css/Payment.css";

const METHOD_OPTIONS = [
  { id: "cash", label: "Cash" },
  { id: "online", label: "Online Payment" },
];

const ONLINE_OPTIONS = [
  { id: "gcash", label: "Gcash" },
  { id: "paymaya", label: "Paymaya" },
  { id: "qrph", label: "QRPH" },
];

export default function PaymentModal({
  isOpen,
  mode,
  onSelect,
  onBack,
  onClose,
}) {
  if (!isOpen) return null;

  const options = mode === "online" ? ONLINE_OPTIONS : METHOD_OPTIONS;

  return createPortal(
    <div className="payment-overlay" onClick={onClose}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Mode of Payment</h2>

        <div className="payment-options">
          {options.map((opt) => (
            <button
              key={opt.id}
              className="payment-option-button"
              onClick={() => onSelect(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button className="payment-back-button" onClick={onBack}>
          Back
        </button>
      </div>
    </div>,
    document.body,
  );
}

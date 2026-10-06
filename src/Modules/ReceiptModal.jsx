import { createPortal } from "react-dom";
import "../Css/Payment.css";

export default function ReceiptModal({ isOpen, onConfirm, onClose }) {
  if (!isOpen) return null;

  return createPortal(
    <div className="payment-overlay" onClick={onClose}>
      <div
        className="payment-modal receipt-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Printing Receipt...</h2>

        <div className="receipt-icon" aria-hidden="true">
          <ReceiptIcon />
        </div>

        <div className="payment-small-actions">
          <button className="payment-small-button" onClick={onClose}>
            Cancel
          </button>
          <button className="payment-small-button" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ReceiptIcon() {
  return (
    <svg width="64" height="72" viewBox="0 0 64 72" fill="none">
      <path
        d="M8 2h48v66l-8-6-8 6-8-6-8 6-8-6-8 6V2z"
        stroke="#1a1a1a"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <line
        x1="16"
        y1="18"
        x2="48"
        y2="18"
        stroke="#1a1a1a"
        strokeWidth="2.5"
      />
      <line
        x1="16"
        y1="28"
        x2="48"
        y2="28"
        stroke="#1a1a1a"
        strokeWidth="2.5"
      />
      <line
        x1="16"
        y1="38"
        x2="34"
        y2="38"
        stroke="#1a1a1a"
        strokeWidth="2.5"
      />
      <circle cx="42" cy="46" r="10" fill="#1a1a1a" />
      <text
        x="42"
        y="50"
        fontSize="12"
        fill="#fff"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
      >
        $
      </text>
    </svg>
  );
}

import { useState, useEffect } from "react";

const API_URL = "http://localhost:3000/api";

// Whole centavos for the on-screen math (avoids 0.1 + 0.2 problems).
const toCents = (value) => Math.round(Number(value) * 100);
const peso = (cents) =>
  `\u20b1${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  box: {
    background: "#fff",
    color: "#111",
    borderRadius: 8,
    padding: 20,
    width: "min(520px, 92vw)",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  row: { display: "flex", gap: 8, alignItems: "center", marginBottom: 8 },
  field: { width: "100%", padding: 6, marginBottom: 10 },
  line: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "4px 0",
    borderBottom: "1px solid #ddd",
  },
  error: { color: "red", marginBottom: 10 },
};

// token: JWT from App.jsx
// barber: the barber whose status button was clicked ({ id, name, status })
// onDone: called when the modal closes (Dashboard reloads the queue)
export default function TransactionModal({ token, barber, onDone }) {
  const [services, setServices] = useState([]);
  const [open, setOpen] = useState(null); // the barber's open transaction, if any
  const [checking, setChecking] = useState(barber.status === "on_service");
  const [serviceId, setServiceId] = useState("");
  const [cart, setCart] = useState([]); // [{ service_id, name, price, quantity }]
  const [amountPaid, setAmountPaid] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // server reply after saving

  const api = async (endpoint, options = {}) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    if (!response.ok) {
      throw new Error((data && data.message) || `Request failed (${response.status})`);
    }
    return data;
  };

  // The barber's open (unpaid/partial) transaction, or null for a new customer.
  const loadOpen = async () => {
    setOpen(await api(`/barbers/${barber.id}/open-transaction`));
  };

  useEffect(() => {
    api("/services")
      .then(setServices)
      .catch((err) => setError(err.message));
    if (barber.status === "on_service") {
      loadOpen()
        .catch((err) => setError(err.message))
        .finally(() => setChecking(false));
    }
  }, []);

  const addService = () => {
    const service = services.find((s) => s.id === Number(serviceId));
    if (!service) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.service_id === service.id);
      if (existing) {
        return prev.map((l) =>
          l.service_id === service.id ? { ...l, quantity: Math.min(l.quantity + 1, 20) } : l,
        );
      }
      return [
        ...prev,
        { service_id: service.id, name: service.name, price: service.price, quantity: 1 },
      ];
    });
    setServiceId("");
  };

  const changeQuantity = (id, delta) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.service_id === id ? { ...l, quantity: Math.min(l.quantity + delta, 20) } : l,
        )
        .filter((l) => l.quantity > 0),
    );
  };

  // Totals: what is already saved (open transaction) + what is in the cart now.
  const cartCents = cart.reduce((sum, l) => sum + toCents(l.price) * l.quantity, 0);
  const totalCents = (open ? toCents(open.total_amount) : 0) + cartCents;
  const alreadyPaidCents = open ? toCents(open.amount_paid) : 0;
  const dueCents = Math.max(0, totalCents - alreadyPaidCents);
  const payNowCents = amountPaid === "" ? 0 : toCents(amountPaid);
  const remainingCents = Math.max(0, dueCents - payNowCents);
  const changeCents = Math.max(0, payNowCents - dueCents);

  const handleSave = async () => {
    setError(null);
    if (!Number.isFinite(payNowCents) || payNowCents < 0) {
      return setError("Enter a valid payment amount.");
    }
    if (!open && cart.length === 0) return setError("Add at least one service.");
    if (open && cart.length === 0 && payNowCents === 0) {
      return setError("Add a service or enter a payment.");
    }

    setSubmitting(true);
    let itemsSaved = false;
    try {
      const items = cart.map((l) => ({ service_id: l.service_id, quantity: l.quantity }));
      let data;
      if (!open) {
        // New customer: one request saves the transaction, items and payment.
        data = await api("/transactions", {
          method: "POST",
          body: JSON.stringify({
            barber_id: barber.id,
            items,
            payment_method: "cash",
            amount_paid: payNowCents / 100,
          }),
        });
      } else {
        // Same customer(s): add more services first, then take the payment.
        if (items.length > 0) {
          data = await api(`/transactions/${open.id}/items`, {
            method: "POST",
            body: JSON.stringify({ items }),
          });
          itemsSaved = true;
        }
        if (payNowCents > 0) {
          data = await api(`/transactions/${open.id}/payment`, {
            method: "PUT",
            body: JSON.stringify({ amount: payNowCents / 100 }),
          });
        }
      }
      setResult(data);
    } catch (err) {
      if (itemsSaved) {
        // The services were saved but the payment failed: refresh what is saved
        // and clear the cart so the services are not added twice.
        setCart([]);
        await loadOpen().catch(() => {});
        setError(`Services were saved, but the payment failed: ${err.message}`);
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Frees the barber by hand (customer left, wrong click, etc.).
  // An unpaid balance stays in the records.
  const handleSetAvailable = async () => {
    if (!window.confirm(`Set ${barber.name} to available? Any unpaid balance stays on record.`)) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api(`/barbers/${barber.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "available" }),
      });
      onDone();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div style={styles.overlay}>
        <div style={styles.box}>Loading...</div>
      </div>
    );
  }

  // After saving: show a short summary, then close.
  if (result) {
    return (
      <div style={styles.overlay}>
        <div style={styles.box}>
          <h2>Transaction #{result.id} saved</h2>
          <p>Barber: {barber.name}</p>
          <p>Total: {peso(toCents(result.total_amount))}</p>
          <p>Paid: {peso(toCents(result.amount_paid))}</p>
          <p>Remaining: {peso(toCents(result.remaining))}</p>
          <p>Change to give: {peso(toCents(result.change))}</p>
          <p>
            Status: <strong>{result.payment_status}</strong>
          </p>
          <button onClick={onDone}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <h2>{open ? `Transaction #${open.id}` : "New Transaction"}</h2>
        <p>
          Barber: <strong>{barber.name}</strong>
        </p>

        {error && <div style={styles.error}>{error}</div>}

        {open && (
          <>
            <label>Services so far</label>
            {open.items.map((i) => (
              <div key={i.id} style={styles.line}>
                <span>
                  {i.service_name} x{i.quantity}
                </span>
                <span>{peso(toCents(i.line_total))}</span>
              </div>
            ))}
            <p>Paid so far: {peso(alreadyPaidCents)}</p>
          </>
        )}

        <label>{open ? "Add more services" : "Services"}</label>
        <div style={styles.row}>
          <select
            style={{ flex: 1, padding: 6 }}
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            <option value="">-- Select service --</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({peso(toCents(s.price))})
              </option>
            ))}
          </select>
          <button onClick={addService} disabled={!serviceId}>
            Add
          </button>
        </div>

        {cart.map((l) => (
          <div key={l.service_id} style={styles.line}>
            <span>
              {l.name} x{l.quantity}
            </span>
            <span>
              {peso(toCents(l.price) * l.quantity)}{" "}
              <button onClick={() => changeQuantity(l.service_id, -1)}>-</button>{" "}
              <button onClick={() => changeQuantity(l.service_id, 1)}>+</button>
            </span>
          </div>
        ))}

        <p>
          <strong>Total: {peso(totalCents)}</strong>
        </p>
        <p>Balance to pay: {peso(dueCents)}</p>

        <label>Payment method</label>
        <input style={styles.field} value="Cash" disabled readOnly />

        <label>Payment now (optional if the group pays later)</label>
        <div style={styles.row}>
          <input
            style={{ flex: 1, padding: 6 }}
            type="number"
            min="0"
            step="0.01"
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            placeholder="0.00"
          />
          <button onClick={() => setAmountPaid((dueCents / 100).toFixed(2))} disabled={dueCents === 0}>
            Exact
          </button>
        </div>
        <p>Remaining after payment: {peso(remainingCents)}</p>
        <p>Change: {peso(changeCents)}</p>

        <div style={styles.row}>
          <button onClick={handleSave} disabled={submitting}>
            {submitting ? "Saving..." : "Confirm"}
          </button>
          <button onClick={onDone} disabled={submitting}>
            Cancel
          </button>
          {barber.status === "on_service" && (
            <button onClick={handleSetAvailable} disabled={submitting}>
              Set Available
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
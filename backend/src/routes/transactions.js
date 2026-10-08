const express = require("express");
const db = require("../../db");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

const SERVER_ERROR = "Server error. Please try again.";

// Turns an id from the URL or body into a positive whole number, or null.
function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Money is calculated in whole centavos (integers) so there are no
// floating point errors like 0.1 + 0.2. Returns null if the value is invalid.
function toCents(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 99999999.99) return null;
  return Math.round(n * 100);
}

// Centavos -> string with 2 decimals for MySQL DECIMAL columns.
function centsToDb(cents) {
  return (cents / 100).toFixed(2);
}

// pending = nothing paid, partial = some paid, paid = fully paid.
function getPaymentStatus(paidCents, totalCents) {
  if (paidCents >= totalCents) return "paid";
  if (paidCents > 0) return "partial";
  return "pending";
}

async function safeRollback(conn) {
  try {
    await conn.rollback();
  } catch (err) {
    console.error("Rollback error:", err);
  }
}

// Checks the items array from the browser. Returns clean lines, or null if
// anything is invalid (1 to 20 lines, whole quantity from 1 to 20).
function parseLines(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 20) return null;
  const lines = [];
  for (const item of items) {
    const serviceId = parseId(item && item.service_id);
    const quantity = item && item.quantity === undefined ? 1 : Number(item && item.quantity);
    if (serviceId === null || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      return null;
    }
    lines.push({ serviceId, quantity });
  }
  return lines;
}

// Reads the CURRENT service prices from the database (prices from the browser
// are never trusted). Returns Map(serviceId -> centavos), or null if a service
// does not exist.
async function loadPrices(conn, lines) {
  const serviceIds = [...new Set(lines.map((l) => l.serviceId))];
  const placeholders = serviceIds.map(() => "?").join(",");
  const [services] = await conn.execute(
    `SELECT service_id, price FROM services WHERE service_id IN (${placeholders})`,
    serviceIds,
  );
  const prices = new Map(
    services.map((s) => [s.service_id, Math.round(Number(s.price) * 100)]),
  );
  return prices.size === serviceIds.length ? prices : null;
}

// Saves each service line with the price AT THIS MOMENT (price snapshot).
async function insertLines(conn, transactionId, lines, prices) {
  for (const l of lines) {
    await conn.execute(
      `INSERT INTO transaction_items (transaction_id, service_id, price, quantity)
       VALUES (?, ?, ?, ?)`,
      [transactionId, l.serviceId, centsToDb(prices.get(l.serviceId)), l.quantity],
    );
  }
}

// The barber's CURRENT open transaction: his latest transaction, if he is on
// service and it is not fully paid yet. Otherwise null. (An old unpaid
// transaction left behind after "Set Available" is not "open" anymore.)
async function getOpenTransaction(conn, barberId) {
  const [rows] = await conn.execute(
    `SELECT t.transaction_id, t.total_amount, t.amount_paid, t.payment_status
     FROM transactions t
     JOIN barbers b ON b.barber_id = t.barber_id
     WHERE t.barber_id = ? AND b.status = 'on_service'
     ORDER BY t.transaction_id DESC
     LIMIT 1`,
    [barberId],
  );
  return rows.length > 0 && rows[0].payment_status !== "paid" ? rows[0] : null;
}

// One transaction with its items, or null if it does not exist.
// price is the snapshot saved at the time of sale, not services.price.
async function loadTransaction(conn, id) {
  const [rows] = await conn.execute(
    `SELECT t.transaction_id, t.barber_id, b.barber_name, u.username AS cashier,
            t.total_amount, t.amount_paid, t.payment_method, t.payment_status,
            t.created_at
     FROM transactions t
     LEFT JOIN barbers b ON b.barber_id = t.barber_id
     LEFT JOIN users u ON u.user_id = t.user_id
     WHERE t.transaction_id = ?`,
    [id],
  );
  if (rows.length === 0) return null;
  const t = rows[0];

  const [items] = await conn.execute(
    `SELECT i.item_id, i.service_id, s.service_name, i.price, i.quantity
     FROM transaction_items i
     JOIN services s ON s.service_id = i.service_id
     WHERE i.transaction_id = ?
     ORDER BY i.item_id`,
    [id],
  );

  return {
    id: t.transaction_id,
    barber_id: t.barber_id,
    barber_name: t.barber_name,
    cashier: t.cashier,
    total_amount: Number(t.total_amount),
    amount_paid: Number(t.amount_paid),
    remaining: Number(t.total_amount) - Number(t.amount_paid),
    payment_method: t.payment_method,
    payment_status: t.payment_status,
    created_at: t.created_at,
    items: items.map((i) => ({
      id: i.item_id,
      service_id: i.service_id,
      service_name: i.service_name,
      price: Number(i.price),
      quantity: i.quantity,
      line_total: Number(i.price) * i.quantity,
    })),
  };
}

// POST /api/transactions  (admin and cashier)
// Body: { barber_id, items: [{ service_id, quantity }], payment_method, amount_paid }
// Everything happens in ONE database transaction: the transaction row, its
// items, the barber's status and the queue move. If anything fails, nothing
// is saved.
router.post("/transactions", verifyToken, async (req, res) => {
  const body = req.body || {};
  const barberId = parseId(body.barber_id);
  const paymentMethod = body.payment_method;
  const tenderedCents = toCents(body.amount_paid === undefined ? 0 : body.amount_paid);

  if (barberId === null) {
    return res.status(400).json({ message: "Select a barber." });
  }
  if (paymentMethod !== "cash") {
    return res.status(400).json({ message: "Only cash payment is supported for now." });
  }
  if (tenderedCents === null) {
    return res.status(400).json({ message: "Invalid payment amount." });
  }
  const lines = parseLines(body.items);
  if (lines === null) {
    return res.status(400).json({ message: "Add 1 to 20 services with a valid quantity." });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Lock the ACTIVE barbers (the Active Barber Queue only).
    const [queue] = await conn.execute(
      `SELECT barber_id, status
       FROM barbers
       WHERE is_active_today = TRUE
       ORDER BY queue_order ASC, barber_id ASC
       FOR UPDATE`,
    );
    const barber = queue.find((b) => b.barber_id === barberId);
    if (!barber) {
      await safeRollback(conn);
      return res
        .status(400)
        .json({ message: "That barber is not in today's active queue." });
    }
    // A barber who already has an open (unpaid/partial) transaction must use
    // "add services" instead. An on_service barber with NO open transaction
    // (status set by hand) can still start a new one.
    if (barber.status === "on_service" && (await getOpenTransaction(conn, barberId))) {
      await safeRollback(conn);
      return res.status(409).json({
        message: "This barber already has an open transaction. Add services to it.",
      });
    }

    // 2. Current service prices from the database.
    const priceById = await loadPrices(conn, lines);
    if (priceById === null) {
      await safeRollback(conn);
      return res.status(400).json({ message: "One or more services do not exist." });
    }

    // 3. Total, and how much of the cash is applied to the bill.
    const totalCents = lines.reduce(
      (sum, l) => sum + priceById.get(l.serviceId) * l.quantity,
      0,
    );
    const paidCents = Math.min(tenderedCents, totalCents); // what counts as paid
    const changeCents = Math.max(0, tenderedCents - totalCents);
    const status = getPaymentStatus(paidCents, totalCents);

    // 4. Save the transaction (user_id comes from the token, not the browser).
    const [result] = await conn.execute(
      `INSERT INTO transactions
         (barber_id, user_id, total_amount, payment_method, amount_paid, payment_status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        barberId,
        req.user.userId,
        centsToDb(totalCents),
        paymentMethod,
        centsToDb(paidCents),
        status,
      ],
    );
    const transactionId = result.insertId;

    // 5. Save each service line with the price AT THIS MOMENT (price snapshot).
    await insertLines(conn, transactionId, lines, priceById);

    // 6. Same rule as Module 3: the barber who takes the customer goes to the
    //    TOP and the other ACTIVE barbers shift down. Pool barbers are untouched.
    const newOrder = [
      barberId,
      ...queue.filter((b) => b.barber_id !== barberId).map((b) => b.barber_id),
    ];
    for (let i = 0; i < newOrder.length; i++) {
      await conn.execute("UPDATE barbers SET queue_order = ? WHERE barber_id = ?", [
        i + 1,
        newOrder[i],
      ]);
    }

    // 7. on_service while unpaid or partially paid; available if paid in full.
    await conn.execute("UPDATE barbers SET status = ? WHERE barber_id = ?", [
      status === "paid" ? "available" : "on_service",
      barberId,
    ]);

    await conn.commit();
    return res.status(201).json({
      id: transactionId,
      barber_id: barberId,
      total_amount: totalCents / 100,
      amount_paid: paidCents / 100,
      remaining: (totalCents - paidCents) / 100,
      change: changeCents / 100,
      payment_status: status,
    });
  } catch (err) {
    await safeRollback(conn);
    console.error("Create transaction error:", err);
    return res.status(500).json({ message: SERVER_ERROR });
  } finally {
    conn.release();
  }
});

// POST /api/transactions/:id/items  (admin and cashier)
// Body: { items: [{ service_id, quantity }] }
// Adds more services to the barber's OPEN transaction (for example relatives
// who pay together at the end). The total goes up; the status is recalculated.
router.post("/transactions/:id/items", verifyToken, async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "Invalid transaction id." });
  }
  const lines = parseLines((req.body || {}).items);
  if (lines === null) {
    return res.status(400).json({ message: "Add 1 to 20 services with a valid quantity." });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      `SELECT transaction_id, barber_id, total_amount, amount_paid, payment_status
       FROM transactions
       WHERE transaction_id = ?
       FOR UPDATE`,
      [id],
    );
    if (rows.length === 0) {
      await safeRollback(conn);
      return res.status(404).json({ message: "Transaction not found." });
    }
    const t = rows[0];
    if (t.payment_status === "paid") {
      await safeRollback(conn);
      return res.status(409).json({ message: "This transaction is already fully paid." });
    }

    // Only the barber's current open transaction can receive more services.
    let open = null;
    if (t.barber_id !== null) {
      await conn.execute("SELECT barber_id FROM barbers WHERE barber_id = ? FOR UPDATE", [
        t.barber_id,
      ]);
      open = await getOpenTransaction(conn, t.barber_id);
    }
    if (!open || open.transaction_id !== id) {
      await safeRollback(conn);
      return res
        .status(409)
        .json({ message: "This transaction is no longer open for its barber." });
    }

    const priceById = await loadPrices(conn, lines);
    if (priceById === null) {
      await safeRollback(conn);
      return res.status(400).json({ message: "One or more services do not exist." });
    }

    const addedCents = lines.reduce(
      (sum, l) => sum + priceById.get(l.serviceId) * l.quantity,
      0,
    );
    const totalCents = Math.round(Number(t.total_amount) * 100) + addedCents;
    const paidCents = Math.round(Number(t.amount_paid) * 100);
    const status = getPaymentStatus(paidCents, totalCents);

    await insertLines(conn, id, lines, priceById);
    await conn.execute(
      "UPDATE transactions SET total_amount = ?, payment_status = ? WHERE transaction_id = ?",
      [centsToDb(totalCents), status, id],
    );

    await conn.commit();
    return res.json({
      id,
      total_amount: totalCents / 100,
      amount_paid: paidCents / 100,
      remaining: (totalCents - paidCents) / 100,
      change: 0,
      payment_status: status,
    });
  } catch (err) {
    await safeRollback(conn);
    console.error("Add items error:", err);
    return res.status(500).json({ message: SERVER_ERROR });
  } finally {
    conn.release();
  }
});

// PUT /api/transactions/:id/payment  (admin and cashier)
// Body: { amount }  - an extra cash payment added to what was already paid.
// When the total is fully paid: status becomes "paid" and the barber becomes
// "available" again (the queue position is not changed).
router.put("/transactions/:id/payment", verifyToken, async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "Invalid transaction id." });
  }
  const tenderedCents = toCents((req.body || {}).amount);
  if (tenderedCents === null || tenderedCents <= 0) {
    return res.status(400).json({ message: "Enter a payment amount greater than 0." });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      `SELECT transaction_id, barber_id, total_amount, amount_paid, payment_status
       FROM transactions
       WHERE transaction_id = ?
       FOR UPDATE`,
      [id],
    );
    if (rows.length === 0) {
      await safeRollback(conn);
      return res.status(404).json({ message: "Transaction not found." });
    }
    const t = rows[0];
    if (t.payment_status === "paid") {
      await safeRollback(conn);
      return res.status(409).json({ message: "This transaction is already fully paid." });
    }

    const totalCents = Math.round(Number(t.total_amount) * 100);
    const alreadyPaidCents = Math.round(Number(t.amount_paid) * 100);
    const newPaidCents = Math.min(alreadyPaidCents + tenderedCents, totalCents);
    const changeCents = Math.max(0, alreadyPaidCents + tenderedCents - totalCents);
    const status = getPaymentStatus(newPaidCents, totalCents);

    await conn.execute(
      "UPDATE transactions SET amount_paid = ?, payment_status = ? WHERE transaction_id = ?",
      [centsToDb(newPaidCents), status, id],
    );

    // Fully paid -> the barber is free again (queue_order is NOT touched).
    // Only if this is the barber's LATEST transaction, so paying an old
    // forgotten one can never free a barber who is serving someone else.
    if (status === "paid" && t.barber_id !== null) {
      const [latest] = await conn.execute(
        "SELECT MAX(transaction_id) AS latest_id FROM transactions WHERE barber_id = ?",
        [t.barber_id],
      );
      if (latest[0].latest_id === id) {
        await conn.execute("UPDATE barbers SET status = 'available' WHERE barber_id = ?", [
          t.barber_id,
        ]);
      }
    }

    await conn.commit();
    return res.json({
      id,
      total_amount: totalCents / 100,
      amount_paid: newPaidCents / 100,
      remaining: (totalCents - newPaidCents) / 100,
      change: changeCents / 100,
      payment_status: status,
    });
  } catch (err) {
    await safeRollback(conn);
    console.error("Record payment error:", err);
    return res.status(500).json({ message: SERVER_ERROR });
  } finally {
    conn.release();
  }
});

// GET /api/transactions  (admin and cashier) - newest first, latest 200
router.get("/transactions", verifyToken, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT t.transaction_id, t.barber_id, b.barber_name, u.username AS cashier,
              t.total_amount, t.amount_paid, t.payment_method, t.payment_status,
              t.created_at
       FROM transactions t
       LEFT JOIN barbers b ON b.barber_id = t.barber_id
       LEFT JOIN users u ON u.user_id = t.user_id
       ORDER BY t.created_at DESC, t.transaction_id DESC
       LIMIT 200`,
    );
    return res.json(
      rows.map((r) => ({
        id: r.transaction_id,
        barber_id: r.barber_id,
        barber_name: r.barber_name,
        cashier: r.cashier,
        total_amount: Number(r.total_amount),
        amount_paid: Number(r.amount_paid),
        remaining: Number(r.total_amount) - Number(r.amount_paid),
        payment_method: r.payment_method,
        payment_status: r.payment_status,
        created_at: r.created_at,
      })),
    );
  } catch (err) {
    console.error("Get transactions error:", err);
    return res.status(500).json({ message: SERVER_ERROR });
  }
});

// GET /api/transactions/:id  (admin and cashier) - one transaction + its items
router.get("/transactions/:id", verifyToken, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: "Invalid transaction id." });
    }
    const transaction = await loadTransaction(db, id);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found." });
    }
    return res.json(transaction);
  } catch (err) {
    console.error("Get transaction error:", err);
    return res.status(500).json({ message: SERVER_ERROR });
  }
});

// GET /api/barbers/:id/open-transaction  (admin and cashier)
// The barber's current open transaction with its items, or null if none.
// The status button on the Dashboard uses this to decide: new or add more.
router.get("/barbers/:id/open-transaction", verifyToken, async (req, res) => {
  try {
    const barberId = parseId(req.params.id);
    if (barberId === null) {
      return res.status(400).json({ message: "Invalid barber id." });
    }
    const open = await getOpenTransaction(db, barberId);
    if (!open) return res.json(null);
    return res.json(await loadTransaction(db, open.transaction_id));
  } catch (err) {
    console.error("Get open transaction error:", err);
    return res.status(500).json({ message: SERVER_ERROR });
  }
});

module.exports = router;
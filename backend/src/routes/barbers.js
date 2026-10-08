const express = require("express");
const db = require("../../db");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

const SERVER_ERROR = "Server error. Please try again.";

// Runs after verifyToken. Lets only admins continue.
function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only." });
  }
  next();
}

// Turns the :id from the URL into a positive whole number, or null if invalid.
function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Returns a clean barber name (1 to 100 characters), or "" if invalid.
function cleanName(value) {
  if (typeof value !== "string") return "";
  const name = value.trim();
  return name.length > 0 && name.length <= 100 ? name : "";
}

// Queue rule: the TOP of the list is queue_order 1. The BOTTOM (highest number)
// is the next priority barber for a normal walk-in customer.

// GET /api/barbers  (admin and cashier)
// Returns ONLY barbers who are active today, sorted by queue_order (TOP to BOTTOM).
router.get("/barbers", verifyToken, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT barber_id, barber_name, status
       FROM barbers
       WHERE is_active_today = TRUE
       ORDER BY queue_order ASC, barber_id ASC`,
    );
    // Rename the columns to the names the React page uses.
    // heads is a placeholder (0) until transactions exist in Module 4.
    const barbers = rows.map((row) => ({
      id: row.barber_id,
      name: row.barber_name,
      status: row.status,
      heads: 0,
    }));
    return res.json(barbers);
  } catch (err) {
    console.error("Get barbers error:", err);
    return res.status(500).json({ message: SERVER_ERROR });
  }
});

// GET /api/barbers/pool  (admin and cashier)
// Returns barbers who are NOT active today (the Barber Pool).
router.get("/barbers/pool", verifyToken, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT barber_id, barber_name, status
       FROM barbers
       WHERE is_active_today = FALSE
       ORDER BY barber_id ASC`,
    );
    const barbers = rows.map((row) => ({
      id: row.barber_id,
      name: row.barber_name,
      status: row.status,
      heads: 0,
    }));
    return res.json(barbers);
  } catch (err) {
    console.error("Get barbers pool error:", err);
    return res.status(500).json({ message: SERVER_ERROR });
  }
});

// PUT /api/barbers/:id/status  (admin and cashier)
// When a barber becomes "on_service" (takes a customer) he moves to the TOP
// of the queue and everybody else shifts down. All steps happen in ONE
// database transaction, so two cashiers clicking at the same time cannot
// corrupt the queue order.
router.put("/barbers/:id/status", verifyToken, async (req, res) => {
  const id = parseId(req.params.id);
  const { status } = req.body || {};

  if (id === null) {
    return res.status(400).json({ message: "Invalid barber id." });
  }
  if (status !== "available" && status !== "on_service") {
    return res
      .status(400)
      .json({ message: "Status must be 'available' or 'on_service'." });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Read the whole queue in order and lock the rows until we finish.
    const [queue] = await conn.execute(
      `SELECT barber_id, status
       FROM barbers
       ORDER BY queue_order ASC, barber_id ASC
       FOR UPDATE`,
    );

    const barber = queue.find((b) => b.barber_id === id);
    if (!barber) {
      await conn.rollback();
      return res.status(404).json({ message: "Barber not found." });
    }

    // Only act when the status really changes (protects against double clicks).
    if (barber.status !== status) {
      await conn.execute("UPDATE barbers SET status = ? WHERE barber_id = ?", [
        status,
        id,
      ]);

      if (status === "on_service") {
        // New order: selected barber first, the others keep their relative order.
        const newOrder = [
          id,
          ...queue.filter((b) => b.barber_id !== id).map((b) => b.barber_id),
        ];
        // Renumber the queue 1 to n.
        for (let i = 0; i < newOrder.length; i++) {
          await conn.execute(
            "UPDATE barbers SET queue_order = ? WHERE barber_id = ?",
            [i + 1, newOrder[i]],
          );
        }
      }
    }

    await conn.commit();
    return res.json({ id, status });
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rollbackErr) {
      console.error("Rollback error:", rollbackErr);
    }
    console.error("Update barber status error:", err);
    return res.status(500).json({ message: SERVER_ERROR });
  } finally {
    conn.release();
  }
});

// POST /api/barbers/:id/add-to-queue  (admin and cashier)
// Moves a barber from the pool to the active queue.
// Places him at the TOP (lowest priority for the next walk-in).
// Existing active barbers shift down (their queue_order increases).
router.post("/barbers/:id/add-to-queue", verifyToken, async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "Invalid barber id." });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Check if the barber exists and is not already active.
    const [barber] = await conn.execute(
      "SELECT barber_id, is_active_today FROM barbers WHERE barber_id = ? FOR UPDATE",
      [id],
    );
    if (barber.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Barber not found." });
    }
    if (barber[0].is_active_today) {
      await conn.rollback();
      return res
        .status(400)
        .json({ message: "Barber is already in the active queue." });
    }

    // Shift all active barbers down: queue_order += 1.
    await conn.execute(
      "UPDATE barbers SET queue_order = queue_order + 1 WHERE is_active_today = TRUE",
    );

    // Add the barber to the active queue at the TOP (queue_order = 1).
    await conn.execute(
      "UPDATE barbers SET is_active_today = TRUE, status = 'available', queue_order = 1 WHERE barber_id = ?",
      [id],
    );

    await conn.commit();
    return res
      .status(200)
      .json({
        id,
        message: "Added to queue.",
      });
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rollbackErr) {
      console.error("Rollback error:", rollbackErr);
    }
    console.error("Add to queue error:", err);
    return res.status(500).json({ message: SERVER_ERROR });
  } finally {
    conn.release();
  }
});

// PUT /api/barbers/:id/remove-from-queue  (admin and cashier)
// Removes a barber from the active queue and returns him to the Barber Pool.
// The barber is not deleted; just marked as not active today.
// A barber who is on service (customer not fully paid) cannot be removed.
router.put("/barbers/:id/remove-from-queue", verifyToken, async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: "Invalid barber id." });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Check if the barber exists and is active.
    const [barber] = await conn.execute(
      "SELECT barber_id, is_active_today, status, queue_order FROM barbers WHERE barber_id = ? FOR UPDATE",
      [id],
    );
    if (barber.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Barber not found." });
    }
    if (!barber[0].is_active_today) {
      await conn.rollback();
      return res
        .status(400)
        .json({ message: "Barber is not in the active queue." });
    }
    if (barber[0].status === "on_service") {
      await conn.rollback();
      return res.status(409).json({
        message:
          "This barber is on service. Collect the payment first, or set him available.",
      });
    }

    const removedQueueOrder = barber[0].queue_order;

    // Shift barbers below the removed barber up: queue_order -= 1.
    await conn.execute(
      "UPDATE barbers SET queue_order = queue_order - 1 WHERE is_active_today = TRUE AND queue_order > ?",
      [removedQueueOrder],
    );

    // Remove the barber from the active queue. Set status to available.
    await conn.execute(
      "UPDATE barbers SET is_active_today = FALSE, status = 'available' WHERE barber_id = ?",
      [id],
    );

    await conn.commit();
    return res
      .status(200)
      .json({
        id,
        message: "Removed from queue.",
      });
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rollbackErr) {
      console.error("Rollback error:", rollbackErr);
    }
    console.error("Remove from queue error:", err);
    return res.status(500).json({ message: SERVER_ERROR });
  } finally {
    conn.release();
  }
});

// PUT /api/barbers/reorder  (admin and cashier)
// Reorders the active barber queue.
// Body: { barber_ids: [id1, id2, id3, ...] } in the desired order (TOP to BOTTOM).
// Renumbers queue_order from 1 to n.
router.put("/barbers/reorder", verifyToken, async (req, res) => {
  const { barber_ids } = req.body || {};
  if (!Array.isArray(barber_ids) || barber_ids.length === 0) {
    return res
      .status(400)
      .json({ message: "Provide an array of barber IDs in the new order." });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Verify all IDs are valid and active.
    for (const id of barber_ids) {
      const parsed = parseId(id);
      if (parsed === null) {
        await conn.rollback();
        return res.status(400).json({ message: `Invalid barber id: ${id}.` });
      }
      const [barber] = await conn.execute(
        "SELECT barber_id FROM barbers WHERE barber_id = ? AND is_active_today = TRUE FOR UPDATE",
        [parsed],
      );
      if (barber.length === 0) {
        await conn.rollback();
        return res
          .status(404)
          .json({
            message: `Barber ${parsed} is not in the active queue.`,
          });
      }
    }

    // Renumber all barbers in the new order.
    for (let i = 0; i < barber_ids.length; i++) {
      await conn.execute(
        "UPDATE barbers SET queue_order = ? WHERE barber_id = ?",
        [i + 1, parseId(barber_ids[i])],
      );
    }

    await conn.commit();
    return res.json({ message: "Queue reordered." });
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rollbackErr) {
      console.error("Rollback error:", rollbackErr);
    }
    console.error("Reorder error:", err);
    return res.status(500).json({ message: SERVER_ERROR });
  } finally {
    conn.release();
  }
});

// POST /api/barbers  (admin only) - the new barber goes to the BOTTOM
router.post("/barbers", verifyToken, adminOnly, async (req, res) => {
  try {
    const name = cleanName((req.body || {}).name);
    if (!name) {
      return res
        .status(400)
        .json({ message: "Enter a barber name (up to 100 characters)." });
    }

    // queue_order = current highest number + 1, so he lands at the bottom.
    const [result] = await db.execute(
      `INSERT INTO barbers (barber_name, queue_order)
       SELECT ?, COALESCE(MAX(queue_order), 0) + 1 FROM barbers`,
      [name],
    );
    return res.status(201).json({
      id: result.insertId,
      name,
      status: "available",
      heads: 0,
    });
  } catch (err) {
    console.error("Add barber error:", err);
    return res.status(500).json({ message: SERVER_ERROR });
  }
});

// PUT /api/barbers/:id  (admin only) - changes the name
router.put("/barbers/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: "Invalid barber id." });
    }
    const name = cleanName((req.body || {}).name);
    if (!name) {
      return res
        .status(400)
        .json({ message: "Enter a barber name (up to 100 characters)." });
    }

    const [result] = await db.execute(
      "UPDATE barbers SET barber_name = ? WHERE barber_id = ?",
      [name, id],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Barber not found." });
    }
    return res.json({ id, name });
  } catch (err) {
    console.error("Update barber error:", err);
    return res.status(500).json({ message: SERVER_ERROR });
  }
});

// DELETE /api/barbers/:id  (admin only)
router.delete("/barbers/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: "Invalid barber id." });
    }

    const [result] = await db.execute(
      "DELETE FROM barbers WHERE barber_id = ?",
      [id],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Barber not found." });
    }
    return res.json({ message: "Barber removed." });
  } catch (err) {
    // The foreign key on transactions blocks deleting a barber who has sales.
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        message:
          "This barber already has transactions and can't be removed.",
      });
    }
    console.error("Delete barber error:", err);
    return res.status(500).json({ message: SERVER_ERROR });
  }
});

module.exports = router;
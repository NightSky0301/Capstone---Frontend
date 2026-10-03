const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../../db");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

// Runs after verifyToken. Lets only admins continue.
// req.user.role comes from the signed JWT, not from anything the browser sends.
function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only." });
  }
  next();
}

// Returns a valid price as a number with 2 decimals, or null if invalid.
function parsePrice(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0 || price > 99999999.99) return null;
  return Math.round(price * 100) / 100;
}

const SERVER_ERROR = "Server error. Please try again.";

// GET /api/services  (admin and cashier)
router.get("/services", verifyToken, async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT service_id, service_name, price FROM services ORDER BY service_id",
    );
    // Rename the database columns to the names the React page already uses.
    // price is converted to a number (MySQL DECIMAL arrives as text).
    const services = rows.map((row) => ({
      id: row.service_id,
      name: row.service_name,
      price: Number(row.price),
    }));
    return res.json(services);
  } catch (err) {
    console.error("Get services error:", err);
    return res.status(500).json({ message: SERVER_ERROR });
  }
});

// POST /api/services  (admin only + admin password)
router.post("/services", verifyToken, adminOnly, async (req, res) => {
  try {
    const { name, price, adminPassword } = req.body || {};

    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanPrice = parsePrice(price);

    if (!cleanName || cleanName.length > 100 || cleanPrice === null) {
      return res.status(400).json({
        message:
          "Enter a service name (up to 100 characters) and a price greater than 0.",
      });
    }
    if (typeof adminPassword !== "string" || !adminPassword) {
      return res.status(400).json({ message: "Enter the admin password." });
    }

    // Get the stored hash of the LOGGED-IN admin (id comes from the token).
    const [users] = await db.execute(
      "SELECT password_hash FROM users WHERE user_id = ?",
      [req.user.userId],
    );
    if (users.length === 0) {
      return res.status(401).json({ message: "Not authorized." });
    }

    // Compare the typed password with the hash. Nothing is logged or returned.
    const passwordMatches = await bcrypt.compare(
      adminPassword,
      users[0].password_hash,
    );
    if (!passwordMatches) {
      return res.status(403).json({ message: "Admin password incorrect." });
    }

    const [result] = await db.execute(
      "INSERT INTO services (service_name, price) VALUES (?, ?)",
      [cleanName, cleanPrice],
    );
    return res
      .status(201)
      .json({ id: result.insertId, name: cleanName, price: cleanPrice });
  } catch (err) {
    console.error("Add service error:", err);
    return res.status(500).json({ message: SERVER_ERROR });
  }
});

// PUT /api/services/:id  (admin only) - changes the price
router.put("/services/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid service id." });
    }

    const cleanPrice = parsePrice((req.body || {}).price);
    if (cleanPrice === null) {
      return res
        .status(400)
        .json({ message: "Enter a price greater than 0." });
    }

    const [result] = await db.execute(
      "UPDATE services SET price = ? WHERE service_id = ?",
      [cleanPrice, id],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Service not found." });
    }
    return res.json({ id, price: cleanPrice });
  } catch (err) {
    console.error("Update service error:", err);
    return res.status(500).json({ message: SERVER_ERROR });
  }
});

// DELETE /api/services/:id  (admin only)
router.delete("/services/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid service id." });
    }

    const [result] = await db.execute(
      "DELETE FROM services WHERE service_id = ?",
      [id],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Service not found." });
    }
    return res.json({ message: "Service removed." });
  } catch (err) {
    // The foreign key on transaction_items blocks deleting a service that was sold.
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        message:
          "This service is already used in transactions and can't be removed.",
      });
    }
    console.error("Delete service error:", err);
    return res.status(500).json({ message: SERVER_ERROR });
  }
});

module.exports = router;
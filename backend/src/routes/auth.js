const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../../db");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

// Same message for "wrong username" and "wrong password" so attackers
// cannot find out which usernames exist.
const INVALID_LOGIN = "Incorrect username or password.";

// Saves one row in user_logs (one row = one login attempt).
// Returns the new log_id.
async function writeLog(userId, ip, userAgent, status) {
  const [result] = await db.execute(
    `INSERT INTO user_logs (user_id, login_time, ip_address, user_agent, status)
     VALUES (?, NOW(), ?, ?, ?)`,
    [userId, ip, userAgent, status],
  );
  return result.insertId;
}

// POST /api/login
router.post("/login", async (req, res) => {
  try {
    // Express 5: req.body can be undefined if no JSON was sent, so use || {}
    const { username, password } = req.body || {};

    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      !username.trim() ||
      !password
    ) {
      return res
        .status(400)
        .json({ message: "Enter both a username and password." });
    }

    const ip = req.ip || null;
    const userAgent = req.headers["user-agent"] || null;

    // 1. Find the user (and the role name) by username.
    //    The ? is a placeholder, so user input can never become SQL code.
    const [rows] = await db.execute(
      `SELECT u.user_id, u.username, u.password_hash, u.status, r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.username = ?`,
      [username.trim()],
    );
    const user = rows[0];

    if (!user) {
      // Unknown username: user_logs needs a real user_id, so nothing to log.
      return res.status(401).json({ message: INVALID_LOGIN });
    }

    // 2. Compare the typed password with the stored bcrypt hash.
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      await db.execute(
        "UPDATE users SET login_attempts = login_attempts + 1 WHERE user_id = ?",
        [user.user_id],
      );
      await writeLog(user.user_id, ip, userAgent, "failed");
      return res.status(401).json({ message: INVALID_LOGIN });
    }

    // 3. Correct password, but the account may be disabled.
    if (user.status !== "active") {
      await writeLog(user.user_id, ip, userAgent, "failed");
      return res.status(403).json({
        message: "This account is inactive. Contact the administrator.",
      });
    }

    // 4. Success: reset the counter, save last_login, write the log.
    await db.execute(
      "UPDATE users SET login_attempts = 0, last_login = NOW() WHERE user_id = ?",
      [user.user_id],
    );
    const logId = await writeLog(user.user_id, ip, userAgent, "success");

    // 5. Create the JWT. The payload is readable by anyone, so it never
    //    contains the password or the hash.
    const token = jwt.sign(
      {
        userId: user.user_id,
        username: user.username,
        role: user.role_name,
        logId,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" },
    );

    return res.json({
      token,
      user: { id: user.user_id, username: user.username, role: user.role_name },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res
      .status(500)
      .json({ message: "Server error. Please try again." });
  }
});

// POST /api/logout  (protected: needs a valid token)
router.post("/logout", verifyToken, async (req, res) => {
  try {
    // req.user comes from the token, set by verifyToken.
    await db.execute(
      "UPDATE user_logs SET logout_time = NOW() WHERE log_id = ? AND user_id = ?",
      [req.user.logId, req.user.userId],
    );
    return res.json({ message: "Logged out." });
  } catch (err) {
    console.error("Logout error:", err);
    return res
      .status(500)
      .json({ message: "Server error. Please try again." });
  }
});

module.exports = router;
const jwt = require("jsonwebtoken");

// Runs BEFORE a protected route. It checks the "Authorization: Bearer <token>"
// header. If the token is valid, it saves the token's data in req.user and
// lets the request continue. If not, it stops the request with 401.
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token =
    authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Not authorized." });
  }

  try {
    // Checks the signature (made with JWT_SECRET) and that the token is not expired.
    // Only HS256 is accepted, the same algorithm used to sign it.
    req.user = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    next();
  } catch (err) {
    return res.status(401).json({ message: "Not authorized." });
  }
}

module.exports = verifyToken;
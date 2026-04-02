const jwt = require("jsonwebtoken");
const db = require("../config/database");

const JWT_SECRET = process.env.JWT_SECRET || "finance_secret_key_change_in_production";

/**
 * Verify JWT token and attach user to request
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please provide a Bearer token.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch fresh user from DB (catches deactivated users mid-session)
    const user = db.prepare("SELECT id, name, email, role, status FROM users WHERE id = ?").get(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: "User no longer exists." });
    }

    if (user.status === "inactive") {
      return res.status(403).json({ success: false, message: "Your account has been deactivated." });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired. Please log in again." });
    }
    return res.status(401).json({ success: false, message: "Invalid token." });
  }
}

/**
 * Role-based authorization factory
 * Usage: authorize('admin') or authorize('admin', 'analyst')
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${allowedRoles.join(", ")}. Your role: ${req.user.role}.`,
      });
    }

    next();
  };
}

module.exports = { authenticate, authorize, JWT_SECRET };

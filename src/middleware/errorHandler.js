const { validationResult } = require("express-validator");

/**
 * Catches express-validator errors and returns a clean 422 response
 */
function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

/**
 * Global error handler — catches anything thrown in route handlers
 */
function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${err.message}`);

  // SQLite unique constraint violation
  if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
    return res.status(409).json({ success: false, message: "A record with that value already exists." });
  }

  const status = err.status || 500;
  const message = status < 500 ? err.message : "Internal server error. Please try again later.";

  res.status(status).json({ success: false, message });
}

/**
 * 404 handler for unknown routes
 */
function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
}

module.exports = { validateRequest, errorHandler, notFound };

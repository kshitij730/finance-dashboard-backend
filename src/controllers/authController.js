const authService = require("../services/authService");

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    // Public registration always creates a viewer
    const result = authService.register({ name, email, password, role: "viewer" });
    res.status(201).json({ success: true, message: "Registration successful.", data: result });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = authService.login({ email, password });
    res.status(200).json({ success: true, message: "Login successful.", data: result });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.status(200).json({ success: true, data: req.user });
}

module.exports = { register, login, me };

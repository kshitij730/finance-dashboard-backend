const express = require("express");
const { body } = require("express-validator");
const { authenticate } = require("../middleware/auth");
const { validateRequest } = require("../middleware/errorHandler");
const authController = require("../controllers/authController");

const router = express.Router();

router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required.").isLength({ max: 100 }),
    body("email").isEmail().withMessage("Valid email is required.").normalizeEmail(),
    body("password")
      .isLength({ min: 6 }).withMessage("Password must be at least 6 characters.")
      .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter.")
      .matches(/[0-9]/).withMessage("Password must contain at least one digit."),
  ],
  validateRequest,
  authController.register
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required.").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required."),
  ],
  validateRequest,
  authController.login
);

router.get("/me", authenticate, authController.me);

module.exports = router;

const express = require("express");
const { body, param, query } = require("express-validator");
const { authenticate, authorize } = require("../middleware/auth");
const { validateRequest } = require("../middleware/errorHandler");
const userController = require("../controllers/userController");

const router = express.Router();

// All user management routes require authentication + admin role
router.use(authenticate, authorize("admin"));

router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer."),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100."),
    query("role").optional().isIn(["viewer", "analyst", "admin"]).withMessage("Invalid role filter."),
    query("status").optional().isIn(["active", "inactive"]).withMessage("Invalid status filter."),
  ],
  validateRequest,
  userController.getAll
);

router.get(
  "/:id",
  [param("id").isUUID().withMessage("Invalid user ID.")],
  validateRequest,
  userController.getOne
);

router.post(
  "/",
  [
    body("name").trim().notEmpty().withMessage("Name is required."),
    body("email").isEmail().withMessage("Valid email is required.").normalizeEmail(),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters."),
    body("role")
      .optional()
      .isIn(["viewer", "analyst", "admin"])
      .withMessage("Role must be viewer, analyst, or admin."),
  ],
  validateRequest,
  userController.create
);

router.patch(
  "/:id",
  [
    param("id").isUUID().withMessage("Invalid user ID."),
    body("name").optional().trim().notEmpty().withMessage("Name cannot be empty."),
    body("role")
      .optional()
      .isIn(["viewer", "analyst", "admin"])
      .withMessage("Role must be viewer, analyst, or admin."),
    body("status")
      .optional()
      .isIn(["active", "inactive"])
      .withMessage("Status must be active or inactive."),
  ],
  validateRequest,
  userController.update
);

router.delete(
  "/:id",
  [param("id").isUUID().withMessage("Invalid user ID.")],
  validateRequest,
  userController.remove
);

module.exports = router;

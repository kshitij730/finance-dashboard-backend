const express = require("express");
const { body, param, query } = require("express-validator");
const { authenticate, authorize } = require("../middleware/auth");
const { validateRequest } = require("../middleware/errorHandler");
const recordController = require("../controllers/recordController");

const router = express.Router();

// All record routes require auth
router.use(authenticate);

// GET /records — Viewer, Analyst, Admin can all read
router.get(
  "/",
  authorize("viewer", "analyst", "admin"),
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("type").optional().isIn(["income", "expense"]).withMessage("Type must be income or expense."),
    query("dateFrom").optional().isDate().withMessage("dateFrom must be a valid date (YYYY-MM-DD)."),
    query("dateTo").optional().isDate().withMessage("dateTo must be a valid date (YYYY-MM-DD)."),
    query("minAmount").optional().isFloat({ min: 0 }).withMessage("minAmount must be a non-negative number."),
    query("maxAmount").optional().isFloat({ min: 0 }).withMessage("maxAmount must be a non-negative number."),
  ],
  validateRequest,
  recordController.getAll
);

// GET /records/:id — All roles can read (ownership checked in service)
router.get(
  "/:id",
  authorize("viewer", "analyst", "admin"),
  [param("id").isUUID().withMessage("Invalid record ID.")],
  validateRequest,
  recordController.getOne
);

// POST /records — Admin and Analyst can create
router.post(
  "/",
  authorize("admin", "analyst"),
  [
    body("amount")
      .isFloat({ min: 0.01 })
      .withMessage("Amount must be a positive number."),
    body("type")
      .isIn(["income", "expense"])
      .withMessage("Type must be 'income' or 'expense'."),
    body("category")
      .trim()
      .notEmpty()
      .withMessage("Category is required.")
      .isLength({ max: 100 }),
    body("date")
      .isDate()
      .withMessage("Date must be a valid date (YYYY-MM-DD)."),
    body("notes")
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage("Notes must be a string under 500 characters."),
  ],
  validateRequest,
  recordController.create
);

// PATCH /records/:id — Admin and Analyst can update (ownership enforced in service)
router.patch(
  "/:id",
  authorize("admin", "analyst"),
  [
    param("id").isUUID().withMessage("Invalid record ID."),
    body("amount").optional().isFloat({ min: 0.01 }).withMessage("Amount must be a positive number."),
    body("type").optional().isIn(["income", "expense"]).withMessage("Type must be 'income' or 'expense'."),
    body("category").optional().trim().notEmpty().withMessage("Category cannot be empty."),
    body("date").optional().isDate().withMessage("Date must be a valid date (YYYY-MM-DD)."),
    body("notes").optional().isString().isLength({ max: 500 }),
  ],
  validateRequest,
  recordController.update
);

// DELETE /records/:id — Admin only (or analyst for own records — handled in service)
router.delete(
  "/:id",
  authorize("admin", "analyst"),
  [param("id").isUUID().withMessage("Invalid record ID.")],
  validateRequest,
  recordController.remove
);

module.exports = router;

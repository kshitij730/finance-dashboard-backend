"use strict";

const express    = require("express");
const cors       = require("cors");
const morgan     = require("morgan");
const rateLimit  = require("express-rate-limit");

const authRoutes      = require("./routes/auth");
const userRoutes      = require("./routes/users");
const recordRoutes    = require("./routes/records");
const dashboardRoutes = require("./routes/dashboard");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});
app.use(limiter);

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Finance Dashboard API is running.",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth",      authRoutes);
app.use("/api/users",     userRoutes);
app.use("/api/records",   recordRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

"use strict";

const { initDb } = require("./config/database");
const app = require("./app");

const PORT = process.env.PORT || 3000;

(async () => {
  await initDb();
  app.listen(PORT, () => {
    console.log(`\n🚀 Finance Dashboard API  →  http://localhost:${PORT}`);
    console.log(`📋 Health check           →  http://localhost:${PORT}/health\n`);
    console.log("Demo credentials (run 'npm run seed' first):");
    console.log("  Admin   → admin@finance.com   / Admin@123");
    console.log("  Analyst → analyst@finance.com / Analyst@123");
    console.log("  Viewer  → viewer@finance.com  / Viewer@123\n");
  });
})();

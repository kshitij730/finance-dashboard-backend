"use strict";

const { initDb } = require("./database");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

async function seed() {
  const db = await initDb();
  console.log("🌱 Seeding database...");

  const users = [
    { name: "Super Admin",   email: "admin@finance.com",   password: "Admin@123",   role: "admin" },
    { name: "Alice Analyst", email: "analyst@finance.com", password: "Analyst@123", role: "analyst" },
    { name: "Bob Viewer",    email: "viewer@finance.com",  password: "Viewer@123",  role: "viewer" },
  ];

  for (const u of users) {
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(u.email);
    if (!existing) {
      const hashed = bcrypt.hashSync(u.password, 10);
      db.prepare("INSERT INTO users (id,name,email,password,role,status) VALUES (?,?,?,?,?,'active')")
        .run(uuidv4(), u.name, u.email, hashed, u.role);
      console.log(`  ✔ ${u.email} (${u.role})`);
    } else {
      console.log(`  ~ ${u.email} already exists`);
    }
  }

  const admin = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@finance.com");

  const records = [
    { amount: 85000, type: "income",  category: "Salary",        date: "2025-01-05", notes: "January salary" },
    { amount: 85000, type: "income",  category: "Salary",        date: "2025-02-05", notes: "February salary" },
    { amount: 85000, type: "income",  category: "Salary",        date: "2025-03-05", notes: "March salary" },
    { amount: 20000, type: "expense", category: "Rent",          date: "2025-01-01", notes: "Monthly rent" },
    { amount: 20000, type: "expense", category: "Rent",          date: "2025-02-01", notes: "Monthly rent" },
    { amount: 20000, type: "expense", category: "Rent",          date: "2025-03-01", notes: "Monthly rent" },
    { amount: 3500,  type: "expense", category: "Utilities",     date: "2025-01-15", notes: "Electricity & internet" },
    { amount: 2800,  type: "expense", category: "Food",          date: "2025-01-20", notes: "Groceries" },
    { amount: 5000,  type: "expense", category: "Travel",        date: "2025-02-10", notes: "Business trip" },
    { amount: 15000, type: "income",  category: "Investment",    date: "2025-02-20", notes: "Dividend received" },
    { amount: 4500,  type: "expense", category: "Healthcare",    date: "2025-03-08", notes: "Doctor visit" },
    { amount: 2000,  type: "expense", category: "Entertainment", date: "2025-03-14", notes: "Weekend outing" },
    { amount: 50000, type: "income",  category: "Investment",    date: "2025-03-25", notes: "Stock sale profit" },
    { amount: 1200,  type: "expense", category: "Utilities",     date: "2025-02-16", notes: "Phone bill" },
    { amount: 3000,  type: "expense", category: "Food",          date: "2025-03-22", notes: "Groceries" },
  ];

  for (const r of records) {
    db.prepare(
      "INSERT INTO financial_records (id,user_id,amount,type,category,date,notes) VALUES (?,?,?,?,?,?,?)"
    ).run(uuidv4(), admin.id, r.amount, r.type, r.category, r.date, r.notes);
  }

  console.log(`  ✔ ${records.length} financial records inserted`);
  console.log("\n✅ Seed complete!\n");
  console.log("Demo credentials:");
  console.log("  Admin   → admin@finance.com   / Admin@123");
  console.log("  Analyst → analyst@finance.com / Analyst@123");
  console.log("  Viewer  → viewer@finance.com  / Viewer@123\n");
}

seed().catch(err => { console.error(err); process.exit(1); });

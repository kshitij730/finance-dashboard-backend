"use strict";
const { clearTables, seedUser, seedRecord, makeToken } = require("./helpers");

let app, request;

beforeAll(async () => {
  
  app     = require("../src/app");
  request = require("supertest");
});

beforeEach(clearTables);

function seedAnalystWithRecords() {
  const analyst = seedUser({ role: "analyst" });
  seedRecord(analyst.id, { amount: 10000, type: "income",  category: "Salary", date: "2025-01-05" });
  seedRecord(analyst.id, { amount: 3000,  type: "expense", category: "Rent",   date: "2025-01-10" });
  seedRecord(analyst.id, { amount: 5000,  type: "income",  category: "Salary", date: "2025-02-05" });
  seedRecord(analyst.id, { amount: 1500,  type: "expense", category: "Food",   date: "2025-02-20" });
  return analyst;
}

describe("GET /api/dashboard/summary", () => {
  it("analyst gets correct totals", async () => {
    const analyst = seedAnalystWithRecords();
    const token   = makeToken(analyst.id, "analyst");

    const res = await request(app).get("/api/dashboard/summary")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total_income).toBe(15000);
    expect(res.body.data.total_expenses).toBe(4500);
    expect(res.body.data.net_balance).toBe(10500);
    expect(res.body.data.total_records).toBe(4);
    expect(res.body.data.income_count).toBe(2);
    expect(res.body.data.expense_count).toBe(2);
  });

  it("viewer is blocked from dashboard (403)", async () => {
    const viewer = seedUser({ role: "viewer" });
    const token  = makeToken(viewer.id, "viewer");

    const res = await request(app).get("/api/dashboard/summary")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("returns zeros when analyst has no records", async () => {
    const analyst = seedUser({ role: "analyst" });
    const token   = makeToken(analyst.id, "analyst");

    const res = await request(app).get("/api/dashboard/summary")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total_income).toBe(0);
    expect(res.body.data.net_balance).toBe(0);
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/api/dashboard/summary");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/dashboard/categories", () => {
  it("returns correct category breakdown with net", async () => {
    const analyst = seedAnalystWithRecords();
    const token   = makeToken(analyst.id, "analyst");

    const res = await request(app).get("/api/dashboard/categories")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);

    const salary = res.body.data.find(c => c.category === "Salary");
    expect(salary).toBeDefined();
    expect(salary.income).toBe(15000);
    expect(salary.net).toBe(15000);

    const rent = res.body.data.find(c => c.category === "Rent");
    expect(rent.expense).toBe(3000);
    expect(rent.net).toBe(-3000);
  });
});

describe("GET /api/dashboard/trends/monthly", () => {
  it("returns monthly trend with correct shape", async () => {
    const analyst = seedAnalystWithRecords();
    const token   = makeToken(analyst.id, "analyst");

    const res = await request(app).get("/api/dashboard/trends/monthly?months=12")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    if (res.body.data.length > 0) {
      const m = res.body.data[0];
      expect(m).toHaveProperty("month");
      expect(m).toHaveProperty("income");
      expect(m).toHaveProperty("expense");
      expect(m).toHaveProperty("net");
    }
  });
});

describe("GET /api/dashboard/trends/weekly", () => {
  it("returns weekly trend data", async () => {
    const analyst = seedAnalystWithRecords();
    const token   = makeToken(analyst.id, "analyst");

    const res = await request(app).get("/api/dashboard/trends/weekly?weeks=8")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe("GET /api/dashboard/recent", () => {
  it("respects limit param", async () => {
    const analyst = seedAnalystWithRecords();
    const token   = makeToken(analyst.id, "analyst");

    const res = await request(app).get("/api/dashboard/recent?limit=2")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
  });

  it("analyst only sees their own recent activity", async () => {
    const analyst = seedAnalystWithRecords();
    const other   = seedUser({ role: "analyst", email: "o4@e.com" });
    seedRecord(other.id, { amount: 99999 }); // should not appear
    const token = makeToken(analyst.id, "analyst");

    const res = await request(app).get("/api/dashboard/recent?limit=50")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    res.body.data.forEach(r => expect(r.user_id).toBe(analyst.id));
  });
});

describe("GET /api/dashboard/top-expenses", () => {
  it("returns categories with percentage field", async () => {
    const analyst = seedAnalystWithRecords();
    const token   = makeToken(analyst.id, "analyst");

    const res = await request(app).get("/api/dashboard/top-expenses?limit=5")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    if (res.body.data.length > 0) {
      expect(res.body.data[0]).toHaveProperty("percentage");
      expect(res.body.data[0]).toHaveProperty("total");
      expect(res.body.data[0]).toHaveProperty("category");
    }
  });
});

describe("Admin data scoping", () => {
  it("admin summary aggregates all users' records", async () => {
    const admin   = seedUser({ role: "admin" });
    const analyst = seedUser({ role: "analyst", email: "a5@e.com" });
    seedRecord(admin.id,   { amount: 10000, type: "income", category: "Salary" });
    seedRecord(analyst.id, { amount: 5000,  type: "income", category: "Salary" });
    const token = makeToken(admin.id, "admin");

    const res = await request(app).get("/api/dashboard/summary")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total_income).toBe(15000);
    expect(res.body.data.total_records).toBe(2);
  });
});

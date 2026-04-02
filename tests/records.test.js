"use strict";
const { clearTables, seedUser, seedRecord, makeToken } = require("./helpers");

let app, request;

beforeAll(async () => {
  
  app     = require("../src/app");
  request = require("supertest");
});

beforeEach(clearTables);

describe("GET /api/records", () => {
  it("viewer sees only their own records", async () => {
    const viewer = seedUser({ role: "viewer" });
    const other  = seedUser({ role: "viewer", email: "o@e.com" });
    seedRecord(viewer.id);
    seedRecord(viewer.id, { category: "Rent", type: "expense", amount: 500 });
    seedRecord(other.id);  // should NOT appear
    const token = makeToken(viewer.id, "viewer");

    const res = await request(app).get("/api/records")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.records.length).toBe(2);
  });

  it("admin sees all records", async () => {
    const admin  = seedUser({ role: "admin" });
    const viewer = seedUser({ email: "v@e.com" });
    seedRecord(admin.id);
    seedRecord(viewer.id);
    const token = makeToken(admin.id, "admin");

    const res = await request(app).get("/api/records")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.records.length).toBe(2);
  });

  it("filters by type=income", async () => {
    const analyst = seedUser({ role: "analyst" });
    seedRecord(analyst.id, { type: "income", amount: 5000 });
    seedRecord(analyst.id, { type: "expense", amount: 500, category: "Rent" });
    const token = makeToken(analyst.id, "analyst");

    const res = await request(app).get("/api/records?type=income")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.records.every(r => r.type === "income")).toBe(true);
  });

  it("filters by date range", async () => {
    const analyst = seedUser({ role: "analyst" });
    seedRecord(analyst.id, { date: "2025-01-10" });
    seedRecord(analyst.id, { date: "2025-06-10", amount: 200, category: "Travel" });
    const token = makeToken(analyst.id, "analyst");

    const res = await request(app)
      .get("/api/records?dateFrom=2025-01-01&dateTo=2025-03-31")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.records.length).toBe(1);
  });

  it("filters by category substring", async () => {
    const analyst = seedUser({ role: "analyst" });
    seedRecord(analyst.id, { category: "Healthcare" });
    seedRecord(analyst.id, { category: "Food", amount: 300, type: "expense" });
    const token = makeToken(analyst.id, "analyst");

    const res = await request(app).get("/api/records?category=health")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.records.every(r => r.category.toLowerCase().includes("health"))).toBe(true);
  });

  it("returns paginated results", async () => {
    const analyst = seedUser({ role: "analyst" });
    for (let i = 0; i < 5; i++) {
      seedRecord(analyst.id, { amount: 100 + i });
    }
    const token = makeToken(analyst.id, "analyst");

    const res = await request(app).get("/api/records?limit=2&page=1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.records.length).toBe(2);
    expect(res.body.data.pagination.total).toBe(5);
    expect(res.body.data.pagination.pages).toBe(3);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/records");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/records/:id", () => {
  it("user can fetch their own record", async () => {
    const analyst = seedUser({ role: "analyst" });
    const record  = seedRecord(analyst.id);
    const token   = makeToken(analyst.id, "analyst");

    const res = await request(app).get(`/api/records/${record.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(record.id);
  });

  it("non-admin cannot fetch another user's record", async () => {
    const analyst = seedUser({ role: "analyst" });
    const other   = seedUser({ role: "analyst", email: "o2@e.com" });
    const record  = seedRecord(other.id);
    const token   = makeToken(analyst.id, "analyst");

    const res = await request(app).get(`/api/records/${record.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

describe("POST /api/records", () => {
  it("analyst can create a record", async () => {
    const analyst = seedUser({ role: "analyst" });
    const token   = makeToken(analyst.id, "analyst");

    const res = await request(app).post("/api/records")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 5000, type: "income", category: "Freelance", date: "2025-03-01" });

    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBe(5000);
    expect(res.body.data.user_id).toBe(analyst.id);
  });

  it("admin can create a record", async () => {
    const admin = seedUser({ role: "admin" });
    const token = makeToken(admin.id, "admin");

    const res = await request(app).post("/api/records")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 10000, type: "expense", category: "Equipment", date: "2025-04-01", notes: "Laptop" });

    expect(res.status).toBe(201);
  });

  it("viewer cannot create a record", async () => {
    const viewer = seedUser({ role: "viewer" });
    const token  = makeToken(viewer.id, "viewer");

    const res = await request(app).post("/api/records")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 100, type: "income", category: "Gift", date: "2025-03-01" });

    expect(res.status).toBe(403);
  });

  it("rejects negative/zero amount", async () => {
    const analyst = seedUser({ role: "analyst" });
    const token   = makeToken(analyst.id, "analyst");

    const res = await request(app).post("/api/records")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: -100, type: "income", category: "Gift", date: "2025-03-01" });

    expect(res.status).toBe(422);
  });

  it("rejects invalid type", async () => {
    const analyst = seedUser({ role: "analyst" });
    const token   = makeToken(analyst.id, "analyst");

    const res = await request(app).post("/api/records")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 100, type: "transfer", category: "Gift", date: "2025-03-01" });

    expect(res.status).toBe(422);
  });

  it("rejects missing required fields", async () => {
    const analyst = seedUser({ role: "analyst" });
    const token   = makeToken(analyst.id, "analyst");

    const res = await request(app).post("/api/records")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 100 }); // missing type, category, date

    expect(res.status).toBe(422);
  });
});

describe("PATCH /api/records/:id", () => {
  it("analyst can update their own record", async () => {
    const analyst = seedUser({ role: "analyst" });
    const record  = seedRecord(analyst.id);
    const token   = makeToken(analyst.id, "analyst");

    const res = await request(app).patch(`/api/records/${record.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 9999, category: "Updated" });

    expect(res.status).toBe(200);
    expect(res.body.data.amount).toBe(9999);
    expect(res.body.data.category).toBe("Updated");
  });

  it("analyst cannot update another user's record", async () => {
    const analyst = seedUser({ role: "analyst" });
    const other   = seedUser({ role: "analyst", email: "o3@e.com" });
    const record  = seedRecord(other.id);
    const token   = makeToken(analyst.id, "analyst");

    const res = await request(app).patch(`/api/records/${record.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 1 });

    expect(res.status).toBe(403);
  });

  it("admin can update any record", async () => {
    const admin  = seedUser({ role: "admin" });
    const viewer = seedUser({ email: "v3@e.com" });
    const record = seedRecord(viewer.id);
    const token  = makeToken(admin.id, "admin");

    const res = await request(app).patch(`/api/records/${record.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ category: "AdminUpdated" });

    expect(res.status).toBe(200);
    expect(res.body.data.category).toBe("AdminUpdated");
  });

  it("returns 404 for non-existent record", async () => {
    const admin = seedUser({ role: "admin" });
    const token = makeToken(admin.id, "admin");

    const res = await request(app)
      .patch("/api/records/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 1 });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/records/:id", () => {
  it("analyst soft-deletes their own record", async () => {
    const analyst = seedUser({ role: "analyst" });
    const record  = seedRecord(analyst.id);
    const token   = makeToken(analyst.id, "analyst");

    const deleteRes = await request(app).delete(`/api/records/${record.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(deleteRes.status).toBe(200);

    // Record should not appear in listing
    const listRes = await request(app).get("/api/records")
      .set("Authorization", `Bearer ${token}`);
    expect(listRes.body.data.records.find(r => r.id === record.id)).toBeUndefined();
  });

  it("returns 404 on double-delete", async () => {
    const admin  = seedUser({ role: "admin" });
    const record = seedRecord(admin.id);
    const token  = makeToken(admin.id, "admin");

    await request(app).delete(`/api/records/${record.id}`)
      .set("Authorization", `Bearer ${token}`);

    const res = await request(app).delete(`/api/records/${record.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("viewer cannot delete records", async () => {
    const admin  = seedUser({ role: "admin" });
    const viewer = seedUser({ role: "viewer", email: "vdel@e.com" });
    const record = seedRecord(admin.id);
    const token  = makeToken(viewer.id, "viewer");

    const res = await request(app).delete(`/api/records/${record.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

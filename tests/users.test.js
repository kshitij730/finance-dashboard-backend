"use strict";
const { clearTables, seedUser, makeToken } = require("./helpers");

let app, request;

beforeAll(async () => {
  
  app     = require("../src/app");
  request = require("supertest");
});

beforeEach(clearTables);

describe("GET /api/users", () => {
  it("admin can list all users with pagination", async () => {
    const admin = seedUser({ role: "admin" });
    seedUser({ role: "viewer", email: "v@e.com" });
    seedUser({ role: "analyst", email: "a@e.com" });
    const token = makeToken(admin.id, "admin");

    const res = await request(app).get("/api/users")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.users.length).toBe(3);
    expect(res.body.data.pagination.total).toBe(3);
  });

  it("viewer is forbidden", async () => {
    const viewer = seedUser({ role: "viewer" });
    const res = await request(app).get("/api/users")
      .set("Authorization", `Bearer ${makeToken(viewer.id, "viewer")}`);
    expect(res.status).toBe(403);
  });

  it("analyst is forbidden", async () => {
    const analyst = seedUser({ role: "analyst" });
    const res = await request(app).get("/api/users")
      .set("Authorization", `Bearer ${makeToken(analyst.id, "analyst")}`);
    expect(res.status).toBe(403);
  });

  it("filters by role", async () => {
    const admin = seedUser({ role: "admin" });
    seedUser({ role: "viewer", email: "v2@e.com" });
    seedUser({ role: "analyst", email: "a2@e.com" });
    const token = makeToken(admin.id, "admin");

    const res = await request(app).get("/api/users?role=viewer")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    res.body.data.users.forEach(u => expect(u.role).toBe("viewer"));
  });

  it("filters by status", async () => {
    const admin = seedUser({ role: "admin" });
    seedUser({ role: "viewer", email: "inactive@e.com", status: "inactive" });
    const token = makeToken(admin.id, "admin");

    const res = await request(app).get("/api/users?status=inactive")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    res.body.data.users.forEach(u => expect(u.status).toBe("inactive"));
  });

  it("never returns password field", async () => {
    const admin = seedUser({ role: "admin" });
    const token = makeToken(admin.id, "admin");

    const res = await request(app).get("/api/users")
      .set("Authorization", `Bearer ${token}`);

    res.body.data.users.forEach(u => expect(u.password).toBeUndefined());
  });
});

describe("GET /api/users/:id", () => {
  it("admin can fetch a specific user", async () => {
    const admin  = seedUser({ role: "admin" });
    const target = seedUser({ email: "target@e.com" });
    const token  = makeToken(admin.id, "admin");

    const res = await request(app).get(`/api/users/${target.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(target.id);
  });

  it("returns 404 for unknown id", async () => {
    const admin = seedUser({ role: "admin" });
    const token = makeToken(admin.id, "admin");

    const res = await request(app)
      .get("/api/users/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

describe("POST /api/users", () => {
  it("admin creates user with specified role", async () => {
    const admin = seedUser({ role: "admin" });
    const token = makeToken(admin.id, "admin");

    const res = await request(app).post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "New Analyst", email: "na@e.com", password: "Pass1234", role: "analyst" });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("analyst");
  });

  it("rejects invalid role", async () => {
    const admin = seedUser({ role: "admin" });
    const token = makeToken(admin.id, "admin");

    const res = await request(app).post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "X", email: "x@e.com", password: "Pass1234", role: "superuser" });

    expect(res.status).toBe(422);
  });

  it("rejects duplicate email with 409", async () => {
    const admin = seedUser({ role: "admin" });
    seedUser({ email: "taken@e.com" });
    const token = makeToken(admin.id, "admin");

    const res = await request(app).post("/api/users")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Dup", email: "taken@e.com", password: "Pass1234" });

    expect(res.status).toBe(409);
  });
});

describe("PATCH /api/users/:id", () => {
  it("admin can update role and status", async () => {
    const admin  = seedUser({ role: "admin" });
    const target = seedUser({ email: "patch@e.com" });
    const token  = makeToken(admin.id, "admin");

    const res = await request(app).patch(`/api/users/${target.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "analyst", status: "inactive" });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe("analyst");
    expect(res.body.data.status).toBe("inactive");
  });

  it("returns 400 with no updatable fields", async () => {
    const admin  = seedUser({ role: "admin" });
    const target = seedUser({ email: "noup@e.com" });
    const token  = makeToken(admin.id, "admin");

    const res = await request(app).patch(`/api/users/${target.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/users/:id", () => {
  it("admin soft-deletes (deactivates) another user", async () => {
    const admin  = seedUser({ role: "admin" });
    const target = seedUser({ email: "del@e.com" });
    const token  = makeToken(admin.id, "admin");

    const res = await request(app).delete(`/api/users/${target.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it("admin cannot delete themselves", async () => {
    const admin = seedUser({ role: "admin" });
    const token = makeToken(admin.id, "admin");

    const res = await request(app).delete(`/api/users/${admin.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});

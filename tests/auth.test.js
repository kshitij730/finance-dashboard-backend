"use strict";
const { clearTables, seedUser, makeToken } = require("./helpers");

let app, request;

beforeAll(async () => {
  
  app     = require("../src/app");
  request = require("supertest");
});

beforeEach(clearTables);

describe("POST /api/auth/register", () => {
  it("registers a viewer successfully", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Alice", email: "alice@example.com", password: "Password1",
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe("viewer");
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.password).toBeUndefined();
  });

  it("rejects duplicate email with 409", async () => {
    seedUser({ email: "dup@example.com" });
    const res = await request(app).post("/api/auth/register").send({
      name: "Bob", email: "dup@example.com", password: "Password1",
    });
    expect(res.status).toBe(409);
  });

  it("returns 422 for invalid email", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "C", email: "not-valid", password: "Password1",
    });
    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe("email");
  });

  it("returns 422 for weak password (no uppercase)", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "D", email: "d@example.com", password: "nouppercase1",
    });
    expect(res.status).toBe(422);
  });

  it("returns 422 for password too short", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "E", email: "e@example.com", password: "Ab1",
    });
    expect(res.status).toBe(422);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    seedUser({ email: "login@example.com", role: "admin" });
  });

  it("logs in with correct credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "login@example.com", password: "Password1",
    });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.password).toBeUndefined();
  });

  it("rejects wrong password with 401", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "login@example.com", password: "WrongPassword1",
    });
    expect(res.status).toBe(401);
  });

  it("rejects unknown email with 401", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "nobody@example.com", password: "Password1",
    });
    expect(res.status).toBe(401);
  });

  it("rejects inactive user with 403", async () => {
    seedUser({ email: "inactive@example.com", status: "inactive" });
    const res = await request(app).post("/api/auth/login").send({
      email: "inactive@example.com", password: "Password1",
    });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/auth/me", () => {
  it("returns current user with valid token", async () => {
    const user  = seedUser({ role: "analyst" });
    const token = makeToken(user.id, "analyst");
    const res   = await request(app).get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(user.id);
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with malformed token", async () => {
    const res = await request(app).get("/api/auth/me")
      .set("Authorization", "Bearer this.is.garbage");
    expect(res.status).toBe(401);
  });
});

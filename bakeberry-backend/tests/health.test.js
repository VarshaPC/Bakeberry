import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";

test("health endpoint responds without requiring a database connection", async () => {
	const response = await request(createApp()).get("/api/v1/health");
	assert.equal(response.status, 200);
	assert.equal(response.body.status, "ok");
	assert.ok(response.headers["x-request-id"]);
});

test("unknown API routes return a consistent not-found error", async () => {
	const response = await request(createApp()).get("/api/v1/missing");
	assert.equal(response.status, 404);
	assert.equal(response.body.error.code, "NOT_FOUND");
});
import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/config/env.js";

test("configuration defaults to India and validates port", () => {
	const config = loadConfig({});
	assert.equal(config.port, 4000);
	assert.equal(config.shopTimezone, "Asia/Kolkata");
	assert.equal(config.currency, "INR");
	assert.throws(() => loadConfig({ PORT: "nope" }), /PORT must be a valid TCP port/);
});

test("production requires long, distinct JWT secrets", () => {
	assert.throws(() => loadConfig({ NODE_ENV: "production" }), /MONGODB_URI/);
	assert.throws(() => loadConfig({ NODE_ENV: "production", MONGODB_URI: "mongodb://example.com:27017/bakeberry", JWT_ACCESS_SECRET: "a".repeat(32), JWT_REFRESH_SECRET: "a".repeat(32) }), /must be different/);
});
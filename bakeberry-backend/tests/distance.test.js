import test from "node:test";
import assert from "node:assert/strict";
import { distanceKm, isValidCoordinates } from "../src/utils/distance.js";

test("distance is zero for identical coordinates and symmetric", () => {
	const shop = { latitude: 12.9716, longitude: 77.5946 };
	assert.equal(distanceKm(shop, shop), 0);
	assert.equal(distanceKm(shop, { latitude: 12.9717, longitude: 77.5946 }), distanceKm({ latitude: 12.9717, longitude: 77.5946 }, shop));
});

test("coordinate validation rejects missing and out-of-range values", () => {
	assert.equal(isValidCoordinates({ latitude: 91, longitude: 0 }), false);
	assert.equal(isValidCoordinates({ latitude: 12, longitude: 77 }), true);
	assert.equal(isValidCoordinates(undefined), false);
});
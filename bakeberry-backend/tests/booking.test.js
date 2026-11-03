import test from "node:test";
import assert from "node:assert/strict";
import { minimumBookingDate, shopDate, validateBookingDate } from "../src/utils/booking.js";

test("booking cutoff uses the shop's calendar date, not UTC date", () => {
	const justAfterMidnightInKolkata = new Date("2026-10-21T19:00:00.000Z");
	assert.equal(shopDate(justAfterMidnightInKolkata, "Asia/Kolkata"), "2026-10-22");
	assert.equal(minimumBookingDate(justAfterMidnightInKolkata, 3, "Asia/Kolkata"), "2026-10-25");
});

test("booking validation rejects dates before the three-day minimum", () => {
	const now = new Date("2026-10-21T20:00:00.000Z");
	assert.deepEqual(validateBookingDate("2026-10-24", { now, timezone: "Asia/Kolkata" }), { valid: false, earliestDate: "2026-10-25", reason: "LEAD_TIME_REQUIRED" });
	assert.equal(validateBookingDate("2026-10-25", { now, timezone: "Asia/Kolkata" }).valid, true);
});

test("booking validation enforces longer cake preparation times and real calendar dates", () => {
	const now = new Date("2026-10-21T20:00:00.000Z");
	assert.equal(validateBookingDate("2026-10-26", { now, timezone: "Asia/Kolkata", preparationDays: 5 }).valid, false);
	assert.equal(validateBookingDate("2026-02-30", { now, timezone: "Asia/Kolkata" }).reason, "INVALID_DATE");
});
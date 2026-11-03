import { Router } from "express";
import { body, validationResult } from "express-validator";
import Cake from "../models/Cake.js";
import BookingSlot from "../models/BookingSlot.js";
import { ApiError } from "../middleware/errors.js";
import { config } from "../config/env.js";
import { validateBookingDate } from "../utils/booking.js";

const router = Router();

router.get("/availability", async (req, res, next) => {
	try {
		const startDate = typeof req.query.from === "string" ? req.query.from : undefined;
		const endDate = typeof req.query.to === "string" ? req.query.to : undefined;
		if (!startDate || !endDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate) throw new ApiError(400, "INVALID_DATE_RANGE", "Provide a valid from and to date");
		const slots = await BookingSlot.find({ date: { $gte: startDate, $lte: endDate }, active: true }).select("date slot capacity reserved").sort({ date: 1, slot: 1 }).lean();
		res.json({ slots: slots.map(({ date, slot, capacity, reserved }) => ({ date, slot, remaining: Math.max(0, capacity - reserved), available: capacity > reserved })) });
	} catch (error) { next(error); }
});

router.post("/bookings/validate", body("cakeId").isMongoId(), body("variantId").isMongoId(), body("date").isString().matches(/^\d{4}-\d{2}-\d{2}$/), body("slot").isString().trim().isLength({ min: 1, max: 40 }), async (req, res, next) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) throw new ApiError(422, "VALIDATION_ERROR", "Please check the submitted fields", errors.array());
		const cake = await Cake.findOne({ _id: req.body.cakeId, active: true }).lean();
		const variant = cake?.variants.find((entry) => entry._id.toString() === req.body.variantId && entry.active && entry.advanceEligible);
		if (!variant) throw new ApiError(409, "BOOKING_UNAVAILABLE", "This cake size is not available for advance booking");
		const result = validateBookingDate(req.body.date, { minimumDays: config.minBookingDays, timezone: config.shopTimezone, preparationDays: variant.preparationDays });
		if (!result.valid) throw new ApiError(422, result.reason, `Choose a date on or after ${result.earliestDate}`, { earliestDate: result.earliestDate });
		const slot = await BookingSlot.findOne({ date: req.body.date, slot: req.body.slot, active: true }).lean();
		if (!slot || slot.reserved >= slot.capacity) throw new ApiError(409, "SLOT_UNAVAILABLE", "That booking slot is unavailable");
		res.json({ valid: true, date: req.body.date, slot: req.body.slot, remaining: slot.capacity - slot.reserved });
	} catch (error) { next(error); }
});

export default router;
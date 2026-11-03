import { Router } from "express";
import { body, param, query, validationResult } from "express-validator";
import mongoose from "mongoose";
import Cake from "../models/Cake.js";
import Order from "../models/Order.js";
import BookingSlot from "../models/BookingSlot.js";
import ProductionCapacity from "../models/ProductionCapacity.js";
import AuditLog from "../models/AuditLog.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ApiError } from "../middleware/errors.js";

const router = Router();
router.use(requireAuth, requireRole("admin", "staff"));

function validate(req, _res, next) {
	const errors = validationResult(req);
	if (!errors.isEmpty()) return next(new ApiError(422, "VALIDATION_ERROR", "Please check the submitted fields", errors.array().map(({ path, msg }) => ({ field: path, message: msg }))));
	next();
}

async function audit(req, action, resourceType, resourceId, metadata = {}) {
	await AuditLog.create({ actor: req.user.id, action, resourceType, resourceId: String(resourceId), metadata, requestId: req.id });
}

router.get("/dashboard", async (_req, res, next) => {
	try {
		const [ordersToday, pendingPayment, activeOrders, revenue] = await Promise.all([
			Order.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
			Order.countDocuments({ orderStatus: "pending_payment" }),
			Order.countDocuments({ orderStatus: { $in: ["placed", "confirmed", "preparing", "ready_for_pickup", "out_for_delivery"] } }),
			Order.aggregate([{ $match: { paymentStatus: "paid", createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }, { $group: { _id: null, total: { $sum: "$total" } } }])
		]);
		res.json({ ordersToday, pendingPayment, activeOrders, revenueToday: revenue[0]?.total ?? 0, currency: "INR" });
	} catch (error) { next(error); }
});

router.get("/orders", query("page").optional().isInt({ min: 1 }), query("limit").optional().isInt({ min: 1, max: 100 }), query("status").optional().isString().isLength({ max: 40 }), validate, async (req, res, next) => {
	try {
		const page = Number(req.query.page ?? 1);
		const limit = Number(req.query.limit ?? 25);
		const filter = req.query.status ? { orderStatus: req.query.status } : {};
		const [items, total] = await Promise.all([Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("user", "name email phone").lean(), Order.countDocuments(filter)]);
		res.json({ items, page, limit, total });
	} catch (error) { next(error); }
});

router.patch("/orders/:id/status", param("id").isMongoId(), body("status").isIn(["confirmed", "preparing", "ready_for_pickup", "out_for_delivery", "delivered", "cancelled"]), body("note").optional().isString().isLength({ max: 300 }), validate, async (req, res, next) => {
	try {
		const order = await Order.findById(req.params.id);
		if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order was not found");
		const transitions = {
			placed: ["confirmed", "cancelled"],
			confirmed: ["preparing", "cancelled"],
			preparing: order.fulfillment === "pickup" ? ["ready_for_pickup", "cancelled"] : ["out_for_delivery", "cancelled"],
			ready_for_pickup: ["delivered"],
			out_for_delivery: ["delivered"]
		};
		if (!transitions[order.orderStatus]?.includes(req.body.status)) throw new ApiError(409, "INVALID_ORDER_TRANSITION", `Cannot move order from ${order.orderStatus} to ${req.body.status}`);
		if (req.body.status === "cancelled" && order.paymentStatus === "paid") throw new ApiError(409, "REFUND_REQUIRED", "Paid orders require the refund workflow before cancellation");
		order.orderStatus = req.body.status;
		order.statusHistory.push({ status: req.body.status, note: req.body.note ?? "Updated by BAKEBERRY staff" });
		await order.save();
		await audit(req, "order.status.updated", "order", order.id, { status: req.body.status });
		res.json({ order });
	} catch (error) { next(error); }
});

router.get("/inventory", async (_req, res, next) => {
	try {
		const cakes = await Cake.find({}).select("name active variants").lean();
		res.json({ items: cakes.flatMap((cake) => cake.variants.map((variant) => ({ cakeId: cake._id, cakeName: cake.name, variantId: variant._id, variantName: variant.name, active: cake.active && variant.active, stock: variant.stock, reserved: variant.reserved, available: Math.max(0, variant.stock - variant.reserved), productionCapacityPerDay: variant.productionCapacityPerDay, status: !cake.active || !variant.active ? "unavailable" : variant.stock <= variant.reserved ? "out_of_stock" : variant.stock - variant.reserved <= 2 ? "low_stock" : "in_stock" }))) });
	} catch (error) { next(error); }
});

router.patch("/inventory/:cakeId/:variantId", param("cakeId").isMongoId(), param("variantId").isMongoId(), body("stock").isInt({ min: 0, max: 10000 }), body("reason").trim().isLength({ min: 3, max: 300 }), validate, async (req, res, next) => {
	try {
		const availableForAdjustment = {
			$expr: {
				$anyElementTrue: {
					$map: {
						input: { $filter: { input: "$variants", as: "variant", cond: { $eq: ["$$variant._id", new mongoose.Types.ObjectId(req.params.variantId)] } } },
						as: "variant",
						in: { $lte: ["$$variant.reserved", Number(req.body.stock)] }
					}
				}
			}
		};
	const existing = await Cake.exists({ _id: req.params.cakeId, "variants._id": req.params.variantId });
		if (!existing) throw new ApiError(404, "VARIANT_NOT_FOUND", "Cake size was not found");
		const cake = await Cake.findOneAndUpdate({ _id: req.params.cakeId, ...availableForAdjustment }, { $set: { "variants.$[variant].stock": Number(req.body.stock) } }, { arrayFilters: [{ "variant._id": req.params.variantId }], new: true, runValidators: true }).select("name variants");
		if (!cake) throw new ApiError(409, "STOCK_BELOW_RESERVED", "Stock cannot be set below the already reserved quantity");
		const variant = cake.variants.id(req.params.variantId);
		await audit(req, "inventory.stock.adjusted", "cake_variant", `${cake.id}:${variant.id}`, { stock: variant.stock, reason: req.body.reason });
		res.json({ cakeId: cake.id, variantId: variant.id, stock: variant.stock, reserved: variant.reserved, available: variant.stock - variant.reserved });
	} catch (error) { next(error); }
});

router.put("/booking-slots", body("date").isString().matches(/^\d{4}-\d{2}-\d{2}$/), body("slot").trim().isLength({ min: 1, max: 40 }), body("capacity").isInt({ min: 1, max: 500 }), validate, async (req, res, next) => {
	try {
		const slot = await BookingSlot.findOneAndUpdate({ date: req.body.date, slot: req.body.slot }, { $set: { capacity: Number(req.body.capacity), active: true }, $setOnInsert: { date: req.body.date, slot: req.body.slot, reserved: 0 } }, { upsert: true, new: true, runValidators: true });
		if (slot.capacity < slot.reserved) throw new ApiError(409, "CAPACITY_BELOW_RESERVED", "Capacity cannot be less than existing reservations");
		await audit(req, "booking_slot.upserted", "booking_slot", `${slot.date}:${slot.slot}`, { capacity: slot.capacity });
		res.json({ slot });
	} catch (error) { next(error); }
});

router.put("/production-capacity", body("cakeId").isMongoId(), body("variantId").isMongoId(), body("date").isString().matches(/^\d{4}-\d{2}-\d{2}$/), body("capacity").isInt({ min: 0, max: 500 }), validate, async (req, res, next) => {
	try {
		const cake = await Cake.findOne({ _id: req.body.cakeId, "variants._id": req.body.variantId });
		if (!cake) throw new ApiError(404, "VARIANT_NOT_FOUND", "Cake size was not found");
		const capacity = await ProductionCapacity.findOneAndUpdate({ cake: req.body.cakeId, variant: req.body.variantId, date: req.body.date }, { $set: { capacity: Number(req.body.capacity), active: true }, $setOnInsert: { cake: req.body.cakeId, variant: req.body.variantId, date: req.body.date, reserved: 0 } }, { upsert: true, new: true, runValidators: true });
		if (capacity.capacity < capacity.reserved) throw new ApiError(409, "CAPACITY_BELOW_RESERVED", "Capacity cannot be less than existing reservations");
		await audit(req, "production_capacity.upserted", "production_capacity", capacity.id, { date: capacity.date, capacity: capacity.capacity });
		res.json({ capacity });
	} catch (error) { next(error); }
});

router.get("/reports/sales", query("from").optional().isISO8601({ strict: true }), query("to").optional().isISO8601({ strict: true }), validate, async (req, res, next) => {
	try {
		const match = { paymentStatus: "paid" };
		if (req.query.from || req.query.to) match.createdAt = { ...(req.query.from ? { $gte: new Date(req.query.from) } : {}), ...(req.query.to ? { $lte: new Date(req.query.to) } : {}) };
		const [totals, bestSellers] = await Promise.all([
			Order.aggregate([{ $match: match }, { $group: { _id: null, revenue: { $sum: "$total" }, orders: { $sum: 1 } } }]),
			Order.aggregate([{ $match: match }, { $unwind: "$items" }, { $group: { _id: "$items.name", quantity: { $sum: "$items.quantity" }, revenue: { $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] } } } }, { $sort: { quantity: -1 } }, { $limit: 10 }])
		]);
		res.json({ revenue: totals[0]?.revenue ?? 0, orderCount: totals[0]?.orders ?? 0, bestSellers, currency: "INR" });
	} catch (error) { next(error); }
});

export default router;
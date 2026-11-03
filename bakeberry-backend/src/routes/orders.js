import { Router } from "express";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import Cake from "../models/Cake.js";
import User from "../models/User.js";
import BookingSlot from "../models/BookingSlot.js";
import ProductionCapacity from "../models/ProductionCapacity.js";
import Payment from "../models/Payment.js";
import Order from "../models/Order.js";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/errors.js";
import { config } from "../config/env.js";
import { validateBookingDate } from "../utils/booking.js";
import { distanceKm, isValidCoordinates } from "../utils/distance.js";
import { geocodeAddress } from "../services/geocoding.js";

const router = Router();

router.post("/checkout", requireAuth, body("fulfillment").isIn(["delivery", "pickup"]), body("date").isString().matches(/^\d{4}-\d{2}-\d{2}$/), body("slot").isString().trim().isLength({ min: 1, max: 40 }), body("addressId").optional().isMongoId(), async (req, res, next) => {
	const session = await mongoose.startSession();
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) throw new ApiError(422, "VALIDATION_ERROR", "Please check the submitted fields", errors.array());
		const key = req.get("idempotency-key")?.trim();
		if (!key || key.length < 8 || key.length > 100) throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "Provide an Idempotency-Key header between 8 and 100 characters");
		const priorOrder = await Order.findOne({ user: req.user.id, idempotencyKey: key }).lean();
		if (priorOrder) return res.status(200).json({ order: priorOrder, replayed: true });
		const cart = await Cart.findOne({ user: req.user.id }).lean();
		if (!cart?.items.length) throw new ApiError(400, "CART_EMPTY", "Add at least one cake before checkout");
		let deliveryAddress;
		if (req.body.fulfillment === "delivery") {
			const shopCoordinates = { latitude: config.shopLatitude, longitude: config.shopLongitude };
			if (!isValidCoordinates(shopCoordinates) || config.deliveryFee === null || !Number.isFinite(config.deliveryFee) || config.deliveryFee < 0) throw new ApiError(503, "DELIVERY_NOT_CONFIGURED", "Delivery checkout is unavailable until the bakery configures its location and delivery fee");
			if (!req.body.addressId) throw new ApiError(422, "ADDRESS_REQUIRED", "Choose one of your saved delivery addresses");
			const customer = await User.findById(req.user.id).select("addresses").lean();
			deliveryAddress = customer?.addresses.find((entry) => entry._id.toString() === req.body.addressId);
			if (!deliveryAddress) throw new ApiError(404, "ADDRESS_NOT_FOUND", "Saved delivery address was not found");
			const addressCoordinates = await geocodeAddress(deliveryAddress);
			if (distanceKm(shopCoordinates, addressCoordinates) > config.deliveryRadiusKm) throw new ApiError(422, "OUTSIDE_DELIVERY_AREA", `Instant delivery is available only within ${config.deliveryRadiusKm} km of BAKEBERRY`);
			deliveryAddress = { fullName: deliveryAddress.fullName, phone: deliveryAddress.phone, line1: deliveryAddress.line1, line2: deliveryAddress.line2, city: deliveryAddress.city, postalCode: deliveryAddress.postalCode, coordinates: addressCoordinates };
		}
		const pricedItems = [];
		let subtotal = 0;
		for (const item of cart.items) {
			const cake = await Cake.findOne({ _id: item.cake, active: true }).session(session);
			const variant = cake?.variants.id(item.variant);
			if (!cake || !variant?.active) throw new ApiError(409, "ITEM_UNAVAILABLE", "A cart item is no longer available");
			if (item.flavour && !variant.flavours.includes(item.flavour)) throw new ApiError(422, "INVALID_FLAVOUR", "A selected flavour is not available");
			if (req.body.fulfillment === "delivery" && !variant.instantEligible) throw new ApiError(409, "INSTANT_ORDER_UNAVAILABLE", "A cart item is not eligible for instant delivery; choose pickup or advance booking");
			const lead = validateBookingDate(req.body.date, { minimumDays: req.body.fulfillment === "delivery" ? 0 : config.minBookingDays, timezone: config.shopTimezone, preparationDays: variant.preparationDays });
			if (!lead.valid) throw new ApiError(422, lead.reason, `Choose a date on or after ${lead.earliestDate}`, { earliestDate: lead.earliestDate });
			const unitPrice = variant.price;
			subtotal += unitPrice * item.quantity;
			const readyAvailable = Math.max(0, variant.stock - variant.reserved);
			if (req.body.fulfillment === "delivery" && readyAvailable < item.quantity) throw new ApiError(409, "INSUFFICIENT_READY_STOCK", `${cake.name} is not available for instant delivery in that quantity`);
			const inventoryMode = readyAvailable >= item.quantity ? "ready" : "production";
			if (inventoryMode === "production" && (!variant.advanceEligible || variant.productionCapacityPerDay < item.quantity)) throw new ApiError(409, "ITEM_UNAVAILABLE", `${cake.name} is not available for that date`);
			pricedItems.push({ item, cake, variant, unitPrice, inventoryMode });
		}
		const deliveryFee = req.body.fulfillment === "delivery" ? config.deliveryFee : 0;
		const orderId = new mongoose.Types.ObjectId();
		let createdOrder;
		await session.withTransaction(async () => {
			for (const { item, cake, variant, inventoryMode } of pricedItems) {
				if (inventoryMode === "production") {
					const capacityUpdate = await ProductionCapacity.updateOne({ cake: cake._id, variant: variant._id, date: req.body.date, active: true, $expr: { $gte: [{ $subtract: ["$capacity", "$reserved"] }, item.quantity] } }, { $inc: { reserved: item.quantity } }, { session });
					if (!capacityUpdate.modifiedCount) throw new ApiError(409, "PRODUCTION_CAPACITY_FULL", `${cake.name} has no production capacity on that date`);
					continue;
				}
				const availableVariant = {
					$expr: {
						$anyElementTrue: {
							$map: {
								input: { $filter: { input: "$variants", as: "candidate", cond: { $eq: ["$$candidate._id", variant._id] } } },
								as: "candidate",
								in: { $and: [{ $eq: ["$$candidate.active", true] }, { $gte: [{ $subtract: ["$$candidate.stock", "$$candidate.reserved"] }, item.quantity] }] }
							}
						}
					}
				};
				const reservePipeline = [{
					$set: {
						variants: {
							$map: {
								input: "$variants",
								as: "candidate",
								in: {
									$cond: [
										{ $eq: ["$$candidate._id", variant._id] },
										{ $mergeObjects: ["$$candidate", { reserved: { $add: ["$$candidate.reserved", item.quantity] } }] },
										"$$candidate"
									]
								}
							}
						}
					}
				}];
				const stockUpdate = await Cake.updateOne(
					{ _id: cake._id, active: true, ...availableVariant },
					reservePipeline,
					{ session }
				);
				if (!stockUpdate.modifiedCount) throw new ApiError(409, "INSUFFICIENT_STOCK", `${cake.name} is no longer available in that quantity`);
			}
			const slotUpdate = await BookingSlot.updateOne({ date: req.body.date, slot: req.body.slot, active: true, $expr: { $gt: ["$capacity", "$reserved"] } }, { $inc: { reserved: 1 } }, { session });
			if (!slotUpdate.modifiedCount) throw new ApiError(409, "SLOT_UNAVAILABLE", "That booking slot is no longer available");
			const [order] = await Order.create([{
				_id: orderId,
				orderNumber: `CK-${Date.now().toString(36).toUpperCase()}-${orderId.toString().slice(-6).toUpperCase()}`,
				user: req.user.id,
				idempotencyKey: key,
				items: pricedItems.map(({ item, cake, variant, unitPrice, inventoryMode }) => ({ cake: cake._id, variant: variant._id, name: cake.name, variantName: variant.name, quantity: item.quantity, unitPrice, inventoryMode, flavour: item.flavour, customization: item.customization })),
				fulfillment: req.body.fulfillment,
				address: req.body.fulfillment === "delivery" ? deliveryAddress : undefined,
				bookingDate: req.body.date,
				bookingSlot: req.body.slot,
				subtotal,
				deliveryFee,
				total: subtotal + deliveryFee,
				currency: config.currency,
				reservationExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
				statusHistory: [{ status: "pending_payment", note: "Inventory and slot temporarily reserved" }]
			}], { session });
			createdOrder = order;
		}, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
		await Cart.updateOne({ user: req.user.id }, { $set: { items: [] } });
		res.status(201).json({ order: createdOrder, payment: { status: "pending", integration: "not-configured" } });
	} catch (error) {
		if (error.code === 11000) {
			const existing = await Order.findOne({ user: req.user.id, idempotencyKey: req.get("idempotency-key") }).lean();
			if (existing) return res.status(200).json({ order: existing, replayed: true });
		}
		next(error);
	} finally {
		await session.endSession();
	}
});

router.get("/orders", requireAuth, async (req, res, next) => {
	try {
		const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
		const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
		const [orders, total] = await Promise.all([Order.find({ user: req.user.id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), Order.countDocuments({ user: req.user.id })]);
		res.json({ items: orders, page, limit, total });
	} catch (error) { next(error); }
});

router.get("/orders/:id", requireAuth, async (req, res, next) => {
	try {
		if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, "INVALID_ORDER_ID", "Order ID is invalid");
		const order = await Order.findOne({ _id: req.params.id, user: req.user.id }).lean();
		if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order was not found");
		res.json({ order });
	} catch (error) { next(error); }
});

router.post("/orders/:id/cancel", requireAuth, body("reason").optional().isString().trim().isLength({ max: 300 }), async (req, res, next) => {
	const session = await mongoose.startSession();
	try {
		if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, "INVALID_ORDER_ID", "Order ID is invalid");
		let cancelledOrder;
		await session.withTransaction(async () => {
			const order = await Order.findOne({ _id: req.params.id, user: req.user.id }).session(session);
			if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order was not found");
			if (order.orderStatus !== "pending_payment") throw new ApiError(409, "CANCELLATION_UNAVAILABLE", "Only unpaid orders can be cancelled automatically; contact BAKEBERRY for paid-order assistance");
			for (const item of order.items) {
				if (item.inventoryMode === "production") await ProductionCapacity.updateOne({ cake: item.cake, variant: item.variant, date: order.bookingDate, reserved: { $gte: item.quantity } }, { $inc: { reserved: -item.quantity } }, { session });
				else await Cake.updateOne({ _id: item.cake }, { $inc: { "variants.$[variant].reserved": -item.quantity } }, { arrayFilters: [{ "variant._id": item.variant, "variant.reserved": { $gte: item.quantity } }], session });
			}
			await BookingSlot.updateOne({ date: order.bookingDate, slot: order.bookingSlot, reserved: { $gt: 0 } }, { $inc: { reserved: -1 } }, { session });
			order.orderStatus = "cancelled";
			order.paymentStatus = "failed";
			order.statusHistory.push({ status: "cancelled", note: req.body.reason || "Cancelled by customer before payment" });
			await order.save({ session });
			await Payment.updateOne({ order: order._id, status: { $ne: "paid" } }, { $set: { status: "failed" } }, { session });
			cancelledOrder = order;
		});
		res.json({ order: cancelledOrder });
	} catch (error) { next(error); }
	finally { await session.endSession(); }
});

export default router;
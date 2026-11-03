import crypto from "node:crypto";
import { Router } from "express";
import mongoose from "mongoose";
import Razorpay from "razorpay";
import { body, validationResult } from "express-validator";
import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import Cake from "../models/Cake.js";
import BookingSlot from "../models/BookingSlot.js";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/errors.js";
import { config } from "../config/env.js";

const router = Router();
const razorpay = () => new Razorpay({ key_id: config.razorpayKeyId, key_secret: config.razorpayKeySecret });

function safeCompare(first, second) {
	const left = Buffer.from(first, "hex");
	const right = Buffer.from(second, "hex");
	return left.length === right.length && crypto.timingSafeEqual(left, right);
}

async function finalizePaidOrder(payment, providerPaymentId) {
	const session = await mongoose.startSession();
	try {
		await session.withTransaction(async () => {
			const currentPayment = await Payment.findById(payment._id).session(session);
			if (!currentPayment || currentPayment.status === "paid") return;
			const order = await Order.findById(currentPayment.order).session(session);
			if (!order || order.orderStatus !== "pending_payment" || order.reservationExpiresAt <= new Date()) throw new ApiError(409, "ORDER_RESERVATION_EXPIRED", "The order reservation has expired");
			for (const item of order.items) {
				if (item.inventoryMode === "production") continue;
				const update = await Cake.updateOne(
					{ _id: item.cake, active: true, variants: { $elemMatch: { _id: item.variant, reserved: { $gte: item.quantity }, stock: { $gte: item.quantity } } } },
					{ $inc: { "variants.$.stock": -item.quantity, "variants.$.reserved": -item.quantity } },
					{ session }
				);
				if (!update.modifiedCount) throw new ApiError(409, "INVENTORY_FINALIZATION_FAILED", "Could not finalize reserved inventory");
			}
			currentPayment.status = "paid";
			currentPayment.providerPaymentId = providerPaymentId;
			await currentPayment.save({ session });
			order.paymentStatus = "paid";
			order.orderStatus = "placed";
			order.statusHistory.push({ status: "placed", note: "Payment verified by BAKEBERRY" });
			await order.save({ session });
		});
	} finally { await session.endSession(); }
}

router.post("/create", requireAuth, body("orderId").isMongoId(), async (req, res, next) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) throw new ApiError(422, "VALIDATION_ERROR", "Please check the submitted fields", errors.array());
		if (!config.razorpayKeyId || !config.razorpayKeySecret) throw new ApiError(503, "PAYMENTS_NOT_CONFIGURED", "Online payments are not configured yet");
		const order = await Order.findOne({ _id: req.body.orderId, user: req.user.id, orderStatus: "pending_payment", reservationExpiresAt: { $gt: new Date() } });
		if (!order) throw new ApiError(404, "ORDER_NOT_PAYABLE", "A pending order was not found");
		let payment = await Payment.findOne({ order: order._id, provider: "razorpay" });
		if (!payment) payment = await Payment.create({ order: order._id, user: req.user.id, provider: "razorpay", amount: order.total, currency: order.currency, status: "created" });
		if (!payment.providerOrderId) {
			const providerOrder = await razorpay().orders.create({ amount: Math.round(order.total * 100), currency: order.currency, receipt: order.orderNumber, notes: { bakeberryOrderId: order.id } });
			payment.providerOrderId = providerOrder.id;
			payment.status = "pending";
			await payment.save();
		}
		res.status(201).json({ payment: { id: payment.id, provider: "razorpay", providerOrderId: payment.providerOrderId, amount: payment.amount, currency: payment.currency, keyId: config.razorpayKeyId } });
	} catch (error) { next(error); }
});

router.post("/verify", requireAuth, body("razorpay_order_id").isString().isLength({ min: 1, max: 100 }), body("razorpay_payment_id").isString().isLength({ min: 1, max: 100 }), body("razorpay_signature").isString().isLength({ min: 64, max: 128 }), async (req, res, next) => {
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) throw new ApiError(422, "VALIDATION_ERROR", "Please check the submitted fields", errors.array());
		if (!config.razorpayKeySecret) throw new ApiError(503, "PAYMENTS_NOT_CONFIGURED", "Online payments are not configured yet");
		const payment = await Payment.findOne({ providerOrderId: req.body.razorpay_order_id, user: req.user.id, provider: "razorpay" });
		if (!payment) throw new ApiError(404, "PAYMENT_NOT_FOUND", "Payment was not found");
		const expected = crypto.createHmac("sha256", config.razorpayKeySecret).update(`${req.body.razorpay_order_id}|${req.body.razorpay_payment_id}`).digest("hex");
		if (!safeCompare(expected, req.body.razorpay_signature)) throw new ApiError(400, "PAYMENT_SIGNATURE_INVALID", "Payment verification failed");
		const providerPayment = await razorpay().payments.fetch(req.body.razorpay_payment_id);
		if (providerPayment.order_id !== payment.providerOrderId || providerPayment.status !== "captured" || providerPayment.amount !== Math.round(payment.amount * 100) || providerPayment.currency !== payment.currency) {
			throw new ApiError(409, "PAYMENT_NOT_CAPTURED", "The payment provider has not confirmed the expected captured amount");
		}
		await finalizePaidOrder(payment, req.body.razorpay_payment_id);
		res.json({ status: "paid", orderId: payment.order });
	} catch (error) { next(error); }
});

export async function razorpayWebhookHandler(req, res) {
	if (!config.razorpayWebhookSecret) return res.status(503).json({ error: { code: "WEBHOOK_NOT_CONFIGURED", message: "Payment webhook is not configured" } });
	const supplied = req.get("x-razorpay-signature") ?? "";
	const expected = crypto.createHmac("sha256", config.razorpayWebhookSecret).update(req.body).digest("hex");
	if (!safeCompare(expected, supplied)) return res.status(400).json({ error: { code: "WEBHOOK_SIGNATURE_INVALID", message: "Webhook signature verification failed" } });
	try {
		const event = JSON.parse(req.body.toString("utf8"));
		const eventId = req.get("x-razorpay-event-id");
		if (!eventId) return res.status(400).json({ error: { code: "WEBHOOK_EVENT_ID_REQUIRED", message: "Webhook event ID is missing" } });
		const providerOrderId = event.payload?.payment?.entity?.order_id;
		const providerPaymentId = event.payload?.payment?.entity?.id;
		const providerAmount = event.payload?.payment?.entity?.amount;
		const providerCurrency = event.payload?.payment?.entity?.currency;
		const providerStatus = event.payload?.payment?.entity?.status;
		if (!providerOrderId || !providerPaymentId) return res.status(200).json({ received: true, ignored: true });
		const payment = await Payment.findOne({ providerOrderId, provider: "razorpay" });
		if (!payment) return res.status(200).json({ received: true, ignored: true });
		if (payment.webhookEventIds.includes(eventId)) return res.status(200).json({ received: true, duplicate: true });
		if (["payment.captured", "order.paid"].includes(event.event)) {
			if (providerStatus !== "captured" || providerAmount !== Math.round(payment.amount * 100) || providerCurrency !== payment.currency) return res.status(400).json({ error: { code: "PAYMENT_AMOUNT_MISMATCH", message: "Captured payment does not match the order" } });
			await finalizePaidOrder(payment, providerPaymentId);
		}
		else if (event.event === "payment.failed") await Payment.updateOne({ _id: payment.id, status: { $ne: "paid" } }, { $set: { status: "failed" } });
		await Payment.updateOne({ _id: payment.id }, { $addToSet: { webhookEventIds: eventId } });
		res.status(200).json({ received: true });
	} catch {
		res.status(400).json({ error: { code: "WEBHOOK_INVALID", message: "Webhook payload could not be processed" } });
	}
}

export default router;
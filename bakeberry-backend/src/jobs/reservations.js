import mongoose from "mongoose";
import Order from "../models/Order.js";
import Cake from "../models/Cake.js";
import BookingSlot from "../models/BookingSlot.js";
import ProductionCapacity from "../models/ProductionCapacity.js";

export async function releaseExpiredReservations(now = new Date()) {
	const expired = await Order.find({ orderStatus: "pending_payment", reservationExpiresAt: { $lte: now } }).select("_id").limit(100).lean();
	let released = 0;
	for (const entry of expired) {
		const session = await mongoose.startSession();
		try {
			await session.withTransaction(async () => {
				const order = await Order.findOne({ _id: entry._id, orderStatus: "pending_payment", reservationExpiresAt: { $lte: now } }).session(session);
				if (!order) return;
				for (const item of order.items) {
					if (item.inventoryMode === "production") await ProductionCapacity.updateOne({ cake: item.cake, variant: item.variant, date: order.bookingDate, reserved: { $gte: item.quantity } }, { $inc: { reserved: -item.quantity } }, { session });
					else await Cake.updateOne({ _id: item.cake }, { $inc: { "variants.$[variant].reserved": -item.quantity } }, { arrayFilters: [{ "variant._id": item.variant, "variant.reserved": { $gte: item.quantity } }], session });
				}
				await BookingSlot.updateOne({ date: order.bookingDate, slot: order.bookingSlot, reserved: { $gt: 0 } }, { $inc: { reserved: -1 } }, { session });
				order.orderStatus = "cancelled";
				order.paymentStatus = "failed";
				order.statusHistory.push({ status: "cancelled", note: "Payment reservation expired and inventory was released" });
				await order.save({ session });
				released += 1;
			});
		} finally { await session.endSession(); }
	}
	return released;
}

export function startReservationExpiryJob(intervalMs = 60_000) {
	const timer = setInterval(() => releaseExpiredReservations().catch((error) => console.error("Reservation expiry job failed", error.message)), intervalMs);
	timer.unref();
	return () => clearInterval(timer);
}
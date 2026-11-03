import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
	cake: { type: mongoose.Schema.Types.ObjectId, ref: "Cake", required: true },
	variant: { type: mongoose.Schema.Types.ObjectId, required: true },
	name: { type: String, required: true },
	variantName: { type: String, required: true },
	quantity: { type: Number, required: true, min: 1 },
	unitPrice: { type: Number, required: true, min: 0 },
	inventoryMode: { type: String, enum: ["ready", "production"], default: "ready" },
	flavour: String,
	customization: String
}, { _id: false });

const orderSchema = new mongoose.Schema({
	orderNumber: { type: String, required: true, unique: true },
	user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
	idempotencyKey: { type: String, required: true },
	items: { type: [orderItemSchema], required: true },
	fulfillment: { type: String, enum: ["delivery", "pickup"], required: true },
	address: { type: mongoose.Schema.Types.Mixed },
	bookingDate: { type: String, required: true },
	bookingSlot: { type: String, required: true },
	subtotal: { type: Number, required: true },
	deliveryFee: { type: Number, default: 0 },
	total: { type: Number, required: true },
	currency: { type: String, default: "INR" },
	orderStatus: { type: String, enum: ["pending_payment", "placed", "confirmed", "preparing", "ready_for_pickup", "out_for_delivery", "delivered", "cancelled", "refund_pending", "refunded"], default: "pending_payment", index: true },
	paymentStatus: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending", index: true },
	reservationExpiresAt: { type: Date, required: true, index: true },
	statusHistory: [{ status: String, at: { type: Date, default: Date.now }, note: String }]
}, { timestamps: true, versionKey: false });

orderSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true });
export default mongoose.model("Order", orderSchema);
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
	order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
	user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
	provider: { type: String, enum: ["razorpay"], required: true },
	providerOrderId: { type: String, unique: true, sparse: true },
	providerPaymentId: { type: String, unique: true, sparse: true },
	amount: { type: Number, required: true, min: 1 },
	currency: { type: String, required: true, default: "INR" },
	status: { type: String, enum: ["created", "pending", "paid", "failed", "refunded"], default: "created", index: true },
	webhookEventIds: { type: [String], default: [] },
	refundId: String
}, { timestamps: true, versionKey: false });

paymentSchema.index({ order: 1, provider: 1 }, { unique: true });
export default mongoose.model("Payment", paymentSchema);
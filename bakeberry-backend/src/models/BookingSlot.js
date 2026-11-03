import mongoose from "mongoose";

const bookingSlotSchema = new mongoose.Schema({
	date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
	slot: { type: String, required: true, trim: true, maxlength: 40 },
	capacity: { type: Number, required: true, min: 1 },
	reserved: { type: Number, default: 0, min: 0 },
	active: { type: Boolean, default: true }
}, { timestamps: true, versionKey: false });

bookingSlotSchema.index({ date: 1, slot: 1 }, { unique: true });
export default mongoose.model("BookingSlot", bookingSlotSchema);
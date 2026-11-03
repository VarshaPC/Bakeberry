import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
	label: { type: String, trim: true, maxlength: 40 },
	fullName: { type: String, trim: true, required: true, maxlength: 100 },
	phone: { type: String, trim: true, required: true, maxlength: 20 },
	line1: { type: String, trim: true, required: true, maxlength: 160 },
	line2: { type: String, trim: true, maxlength: 160 },
	city: { type: String, trim: true, required: true, maxlength: 80 },
	postalCode: { type: String, trim: true, required: true, maxlength: 12 },
	coordinates: { latitude: Number, longitude: Number }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
	name: { type: String, required: true, trim: true, maxlength: 100 },
	email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
	phone: { type: String, required: true, unique: true, trim: true, maxlength: 20 },
	passwordHash: { type: String, required: true, select: false },
	role: { type: String, enum: ["customer", "admin", "staff"], default: "customer", index: true },
	refreshTokenHash: { type: String, select: false },
	resetTokenHash: { type: String, select: false },
	resetTokenExpiresAt: Date,
	passwordChangedAt: Date,
	addresses: { type: [addressSchema], default: [] },
	isVerified: { type: Boolean, default: false }
}, { timestamps: true, versionKey: false });

export default mongoose.model("User", userSchema);
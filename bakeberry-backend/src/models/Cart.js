import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
	cake: { type: mongoose.Schema.Types.ObjectId, ref: "Cake", required: true },
	variant: { type: mongoose.Schema.Types.ObjectId, required: true },
	quantity: { type: Number, required: true, min: 1, max: 50 },
	flavour: { type: String, trim: true, maxlength: 50 },
	customization: { type: String, trim: true, maxlength: 300 }
}, { timestamps: true });

const cartSchema = new mongoose.Schema({
	user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
	items: { type: [cartItemSchema], default: [] }
}, { timestamps: true, versionKey: false });

export default mongoose.model("Cart", cartSchema);
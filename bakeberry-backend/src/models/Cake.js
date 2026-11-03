import mongoose from "mongoose";

const variantSchema = new mongoose.Schema({
	name: { type: String, required: true, trim: true, maxlength: 60 },
	weightKg: { type: Number, required: true, min: 0.1, max: 20 },
	price: { type: Number, required: true, min: 1 },
	stock: { type: Number, default: 0, min: 0 },
	reserved: { type: Number, default: 0, min: 0 },
	productionCapacityPerDay: { type: Number, default: 0, min: 0 },
	preparationDays: { type: Number, default: 0, min: 0, max: 60 },
	flavours: [{ type: String, trim: true, maxlength: 50 }],
	egglessAvailable: { type: Boolean, default: false },
	instantEligible: { type: Boolean, default: false },
	advanceEligible: { type: Boolean, default: true },
	active: { type: Boolean, default: true }
});

const cakeSchema = new mongoose.Schema({
	name: { type: String, required: true, trim: true, maxlength: 120, index: "text" },
	description: { type: String, trim: true, maxlength: 2000, default: "" },
	category: { type: String, required: true, trim: true, maxlength: 60, index: true },
	images: [{ url: { type: String, required: true }, alt: { type: String, maxlength: 160 } }],
	variants: { type: [variantSchema], validate: [(value) => value.length > 0, "At least one variant is required"] },
	active: { type: Boolean, default: true, index: true }
}, { timestamps: true, versionKey: false });

cakeSchema.index({ active: 1, category: 1 });
export default mongoose.model("Cake", cakeSchema);
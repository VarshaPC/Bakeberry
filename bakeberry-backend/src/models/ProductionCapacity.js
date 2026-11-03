import mongoose from "mongoose";

const productionCapacitySchema = new mongoose.Schema({
	cake: { type: mongoose.Schema.Types.ObjectId, ref: "Cake", required: true },
	variant: { type: mongoose.Schema.Types.ObjectId, required: true },
	date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
	capacity: { type: Number, required: true, min: 0 },
	reserved: { type: Number, default: 0, min: 0 },
	active: { type: Boolean, default: true }
}, { timestamps: true, versionKey: false });

productionCapacitySchema.index({ cake: 1, variant: 1, date: 1 }, { unique: true });
export default mongoose.model("ProductionCapacity", productionCapacitySchema);
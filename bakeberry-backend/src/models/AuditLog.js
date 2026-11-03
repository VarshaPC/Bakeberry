import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
	actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
	action: { type: String, required: true, maxlength: 100, index: true },
	resourceType: { type: String, required: true, maxlength: 50 },
	resourceId: { type: String, required: true, maxlength: 100 },
	metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
	requestId: { type: String, maxlength: 100 }
}, { timestamps: true, versionKey: false });

auditLogSchema.index({ createdAt: -1 });
export default mongoose.model("AuditLog", auditLogSchema);
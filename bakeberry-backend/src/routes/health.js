import { Router } from "express";
import mongoose from "mongoose";

const router = Router();
router.get("/health", (_req, res) => {
	res.status(200).json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected", timestamp: new Date().toISOString() });
});

export default router;
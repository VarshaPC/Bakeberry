import crypto from "node:crypto";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";
import healthRouter from "./routes/health.js";
import authRouter from "./routes/auth.js";
import cakeRouter from "./routes/cakes.js";
import cartRouter from "./routes/cart.js";
import bookingRouter from "./routes/bookings.js";
import orderRouter from "./routes/orders.js";
import paymentRouter, { razorpayWebhookHandler } from "./routes/payments.js";
import adminRouter from "./routes/admin.js";

export function createApp() {
	const app = express();
	app.disable("x-powered-by");
	app.use((req, res, next) => {
		req.id = req.get("x-request-id")?.slice(0, 100) || crypto.randomUUID();
		res.setHeader("x-request-id", req.id);
		next();
	});
	app.use(helmet({ contentSecurityPolicy: { directives: { "script-src": ["'self'", "https://checkout.razorpay.com"], "frame-src": ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"] } } }));
	app.use(cors({ origin: (origin, callback) => callback(null, !origin || config.corsOrigins.includes(origin)), credentials: true }));
	app.use(compression());
	app.post("/api/v1/payments/webhook", express.raw({ type: "application/json", limit: "100kb" }), razorpayWebhookHandler);
	app.use(express.json({ limit: "100kb" }));
	app.use(express.urlencoded({ extended: false, limit: "20kb" }));
	app.use(cookieParser());
	app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev"));
	app.get("/api/v1/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));
	app.use("/api/v1", healthRouter);
	app.use("/api/v1/auth", authRouter);
	app.use("/api/v1/cakes", cakeRouter);
	app.use("/api/v1/cart", cartRouter);
	app.use("/api/v1", bookingRouter);
	app.use("/api/v1", orderRouter);
	app.use("/api/v1/payments", paymentRouter);
	app.use("/api/v1/admin", adminRouter);
	app.use(notFoundHandler);
	app.use(errorHandler);
	return app;
}
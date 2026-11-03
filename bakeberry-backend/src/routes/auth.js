import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";
import { ApiError } from "../middleware/errors.js";
import { requireAuth } from "../middleware/auth.js";
import { config } from "../config/env.js";
import { createAccessToken, createRefreshToken, hashToken, refreshCookieOptions } from "../utils/tokens.js";
import { sendNotification } from "../services/notifications.js";

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
const validate = (req, _res, next) => {
	const result = validationResult(req);
	if (!result.isEmpty()) return next(new ApiError(422, "VALIDATION_ERROR", "Please check the submitted fields", result.array().map(({ path, msg }) => ({ field: path, message: msg }))));
	next();
};

router.post("/signup", authLimiter,
	body("name").trim().isLength({ min: 2, max: 100 }),
	body("email").trim().isEmail().normalizeEmail(),
	body("phone").trim().matches(/^\+?[0-9 ()-]{8,20}$/),
	body("password").isLength({ min: 10, max: 128 }),
	body("confirmPassword").custom((value, { req }) => value === req.body.password).withMessage("Passwords do not match"), validate,
	async (req, res, next) => {
		try {
			const email = req.body.email.toLowerCase();
			const phone = req.body.phone.replace(/[ ()-]/g, "");
			const passwordHash = await bcrypt.hash(req.body.password, 12);
			const user = await User.create({ name: req.body.name, email, phone, passwordHash });
			const refreshToken = createRefreshToken(user);
			user.refreshTokenHash = hashToken(refreshToken);
			await user.save();
			res.cookie("bakeberry_refresh", refreshToken, refreshCookieOptions());
			res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, phone: user.phone }, accessToken: createAccessToken(user) });
		} catch (error) {
			if (error.code === 11000) return next(new ApiError(409, "ACCOUNT_EXISTS", "An account already uses this email or phone number"));
			next(error);
		}
	}
);

router.post("/login", authLimiter, body("email").trim().isEmail().normalizeEmail(), body("password").isString().isLength({ min: 1, max: 128 }), validate, async (req, res, next) => {
	try {
		const user = await User.findOne({ email: req.body.email.toLowerCase() }).select("+passwordHash");
		if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
		const refreshToken = createRefreshToken(user);
		user.refreshTokenHash = hashToken(refreshToken);
		await user.save();
		res.cookie("bakeberry_refresh", refreshToken, refreshCookieOptions());
		res.json({ user: { id: user.id, name: user.name, email: user.email, phone: user.phone }, accessToken: createAccessToken(user) });
	} catch (error) {
		next(error);
	}
});

router.post("/refresh", authLimiter, async (req, res, next) => {
	try {
		const token = req.cookies.bakeberry_refresh;
		if (!token) throw new ApiError(401, "REFRESH_REQUIRED", "Refresh session is missing");
		const payload = jwt.verify(token, config.refreshSecret, { issuer: "bakeberry-api", audience: "bakeberry-refresh" });
		const user = await User.findById(payload.sub).select("+refreshTokenHash");
		if (!user || !user.refreshTokenHash || user.refreshTokenHash !== hashToken(token)) {
			if (user) { user.refreshTokenHash = undefined; await user.save(); }
			throw new ApiError(401, "REFRESH_REVOKED", "Refresh session is invalid or has been revoked");
		}
		const nextRefresh = createRefreshToken(user);
		user.refreshTokenHash = hashToken(nextRefresh);
		await user.save();
		res.cookie("bakeberry_refresh", nextRefresh, refreshCookieOptions());
		res.json({ accessToken: createAccessToken(user) });
	} catch (error) {
		next(error instanceof ApiError ? error : new ApiError(401, "REFRESH_INVALID", "Refresh session is invalid or expired"));
	}
});

router.post("/logout", async (req, res, next) => {
	try {
		const token = req.cookies.bakeberry_refresh;
		if (token) {
			try {
				const payload = jwt.verify(token, config.refreshSecret, { issuer: "bakeberry-api", audience: "bakeberry-refresh" });
				await User.findByIdAndUpdate(payload.sub, { $unset: { refreshTokenHash: 1 } });
			} catch { /* Always clear an invalid or expired cookie. */ }
		}
		res.clearCookie("bakeberry_refresh", refreshCookieOptions());
		res.status(204).end();
	} catch (error) { next(error); }
});

router.get("/me", requireAuth, async (req, res) => {
	const user = await User.findById(req.user.id).select("name email phone role addresses isVerified");
	res.json({ user });
});

router.patch("/me", requireAuth, body("name").optional().trim().isLength({ min: 2, max: 100 }), body("phone").optional().trim().matches(/^\+?[0-9 ()-]{8,20}$/), validate, async (req, res, next) => {
	try {
		const update = {};
		if (req.body.name !== undefined) update.name = req.body.name;
		if (req.body.phone !== undefined) update.phone = req.body.phone.replace(/[ ()-]/g, "");
		const user = await User.findByIdAndUpdate(req.user.id, update, { new: true, runValidators: true }).select("name email phone role addresses isVerified");
		res.json({ user });
	} catch (error) {
		if (error.code === 11000) return next(new ApiError(409, "PHONE_EXISTS", "An account already uses this phone number"));
		next(error);
	}
});

router.post("/me/addresses", requireAuth,
	body("fullName").trim().isLength({ min: 2, max: 100 }), body("phone").trim().matches(/^\+?[0-9 ()-]{8,20}$/),
	body("line1").trim().isLength({ min: 3, max: 160 }), body("line2").optional().trim().isLength({ max: 160 }),
	body("city").trim().isLength({ min: 2, max: 80 }), body("postalCode").trim().isLength({ min: 3, max: 12 }), validate,
	async (req, res, next) => {
		try {
			const user = await User.findById(req.user.id);
			if (user.addresses.length >= 10) throw new ApiError(400, "ADDRESS_LIMIT", "You can save up to 10 addresses");
			user.addresses.push({ ...req.body, phone: req.body.phone.replace(/[ ()-]/g, "") });
			await user.save();
			res.status(201).json({ addresses: user.addresses });
		} catch (error) { next(error); }
	}
);

router.delete("/me/addresses/:addressId", requireAuth, async (req, res, next) => {
	try {
		const user = await User.findById(req.user.id);
		const address = user.addresses.id(req.params.addressId);
		if (!address) throw new ApiError(404, "ADDRESS_NOT_FOUND", "Address was not found");
		address.deleteOne();
		await user.save();
		res.json({ addresses: user.addresses });
	} catch (error) { next(error); }
});

router.post("/change-password", requireAuth, body("currentPassword").isString().isLength({ min: 1, max: 128 }), body("newPassword").isString().isLength({ min: 10, max: 128 }), validate, async (req, res, next) => {
	try {
		const user = await User.findById(req.user.id).select("+passwordHash");
		if (!(await bcrypt.compare(req.body.currentPassword, user.passwordHash))) throw new ApiError(400, "CURRENT_PASSWORD_INVALID", "Current password is incorrect");
		user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
		user.passwordChangedAt = new Date();
		user.refreshTokenHash = undefined;
		await user.save();
		res.clearCookie("bakeberry_refresh", refreshCookieOptions());
		res.status(204).end();
	} catch (error) { next(error); }
});

router.post("/forgot-password", authLimiter, body("email").trim().isEmail().normalizeEmail(), validate, async (req, res, next) => {
	try {
		const user = await User.findOne({ email: req.body.email.toLowerCase() });
		if (user) {
			const token = crypto.randomBytes(32).toString("hex");
			user.resetTokenHash = hashToken(token);
			user.resetTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
			await user.save();
			await sendNotification({ type: "password-reset", to: user.email, payload: { resetUrl: `${config.frontendUrl}/reset-password?token=${token}`, expiresMinutes: 30 } });
		}
		res.json({ message: "If an account matches that email, reset instructions will be sent" });
	} catch (error) { next(error); }
});

router.post("/reset-password", authLimiter, body("token").isHexadecimal().isLength({ min: 64, max: 64 }), body("password").isString().isLength({ min: 10, max: 128 }), validate, async (req, res, next) => {
	try {
		const user = await User.findOne({ resetTokenHash: hashToken(req.body.token), resetTokenExpiresAt: { $gt: new Date() } }).select("+resetTokenHash");
		if (!user) throw new ApiError(400, "RESET_TOKEN_INVALID", "Reset link is invalid or expired");
		user.passwordHash = await bcrypt.hash(req.body.password, 12);
		user.passwordChangedAt = new Date();
		user.refreshTokenHash = undefined;
		user.resetTokenHash = undefined;
		user.resetTokenExpiresAt = undefined;
		await user.save();
		res.json({ message: "Password updated. Please sign in again." });
	} catch (error) { next(error); }
});

export default router;
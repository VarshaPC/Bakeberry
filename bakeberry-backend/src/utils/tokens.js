import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

export function createAccessToken(user) {
	return jwt.sign({ role: user.role }, config.accessSecret, { subject: user.id, issuer: "bakeberry-api", audience: "bakeberry-customer", expiresIn: config.accessTtl });
}

export function createRefreshToken(user) {
	return jwt.sign({ type: "refresh" }, config.refreshSecret, { subject: user.id, issuer: "bakeberry-api", audience: "bakeberry-refresh", expiresIn: `${config.refreshTtlDays}d` });
}

export function hashToken(token) {
	return crypto.createHash("sha256").update(token).digest("hex");
}

export function refreshCookieOptions() {
	return { httpOnly: true, secure: config.cookieSecure, sameSite: config.cookieSameSite, path: "/api/v1/auth", maxAge: config.refreshTtlDays * 24 * 60 * 60 * 1000 };
}
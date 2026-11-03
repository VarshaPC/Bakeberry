import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { config } from "../config/env.js";
import { ApiError } from "./errors.js";

export async function requireAuth(req, _res, next) {
	try {
		const token = req.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
		if (!token) throw new ApiError(401, "AUTH_REQUIRED", "Sign in to continue");
		const payload = jwt.verify(token, config.accessSecret, { issuer: "bakeberry-api", audience: "bakeberry-customer" });
		const user = await User.findById(payload.sub).select("name email phone role");
		if (!user) throw new ApiError(401, "AUTH_INVALID", "The session is no longer valid");
		req.user = user;
		next();
	} catch (error) {
		next(error instanceof ApiError ? error : new ApiError(401, "AUTH_INVALID", "The access token is invalid or expired"));
	}
}

export function requireRole(...roles) {
	return (req, _res, next) => req.user && roles.includes(req.user.role) ? next() : next(new ApiError(403, "FORBIDDEN", "You are not allowed to perform this action"));
}
import "dotenv/config";

const required = (name, fallback) => process.env[name] ?? fallback;

export function loadConfig(env = process.env) {
	const port = Number(env.PORT ?? 4000);
	if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be a valid TCP port");
	if ((env.NODE_ENV ?? "development") === "production") {
		for (const name of ["MONGODB_URI", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"]) {
			if (!env[name] || env[name].length < 32) throw new Error(`${name} must be configured with at least 32 characters in production`);
		}
		if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) throw new Error("JWT secrets must be different");
	}
	return {
		nodeEnv: env.NODE_ENV ?? "development",
		port,
		mongoUri: env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/bakeberry?replicaSet=rs0",
		accessSecret: required("JWT_ACCESS_SECRET", "development-access-secret-change-me-32-chars"),
		refreshSecret: required("JWT_REFRESH_SECRET", "development-refresh-secret-change-me-32"),
		accessTtl: env.JWT_ACCESS_TTL ?? "15m",
		refreshTtlDays: Number(env.JWT_REFRESH_TTL_DAYS ?? 30),
		frontendUrl: env.FRONTEND_URL ?? "http://127.0.0.1:5500",
		cookieSecure: env.COOKIE_SECURE === "true",
		cookieSameSite: env.COOKIE_SAME_SITE ?? "lax",
		corsOrigins: (env.CORS_ORIGINS ?? "http://localhost:5500,http://127.0.0.1:5500,http://127.0.0.1:5173,http://localhost:5173").split(",").map((origin) => origin.trim()),
		shopTimezone: env.SHOP_TIMEZONE ?? "Asia/Kolkata",
		currency: env.SHOP_CURRENCY ?? "INR",
		minBookingDays: Number(env.SHOP_MIN_BOOKING_DAYS ?? 3),
		deliveryRadiusKm: Number(env.SHOP_DELIVERY_RADIUS_KM ?? 3),
		shopLatitude: env.SHOP_LATITUDE ? Number(env.SHOP_LATITUDE) : null,
		shopLongitude: env.SHOP_LONGITUDE ? Number(env.SHOP_LONGITUDE) : null,
		deliveryFee: env.SHOP_DELIVERY_FEE === undefined || env.SHOP_DELIVERY_FEE === "" ? null : Number(env.SHOP_DELIVERY_FEE),
		geocodingApiKey: env.GEOCODING_API_KEY ?? "",
		razorpayKeyId: env.RAZORPAY_KEY_ID ?? "",
		razorpayKeySecret: env.RAZORPAY_KEY_SECRET ?? "",
		razorpayWebhookSecret: env.RAZORPAY_WEBHOOK_SECRET ?? ""
	};
}

export const config = loadConfig();
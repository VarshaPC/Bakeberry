import { config } from "../config/env.js";

export async function sendNotification({ type, to, payload }) {
	if (config.nodeEnv !== "production") {
		console.info("BAKEBERRY notification (development adapter)", { type, to, payload });
		return { delivered: false, adapter: "development-log" };
	}
	console.warn("Notification provider is not configured", { type });
	return { delivered: false, adapter: "unconfigured" };
}
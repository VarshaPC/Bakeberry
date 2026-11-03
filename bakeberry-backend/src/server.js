import { createApp } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { config } from "./config/env.js";
import { startReservationExpiryJob } from "./jobs/reservations.js";

await connectDatabase();
const server = createApp().listen(config.port, () => console.info(`BAKEBERRY API listening on port ${config.port}`));
const stopReservationJob = startReservationExpiryJob();

async function shutdown(signal) {
	console.info(`${signal} received; shutting down`);
	server.close(async () => {
		stopReservationJob();
		await disconnectDatabase();
		process.exit(0);
	});
	setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
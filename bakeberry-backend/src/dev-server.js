import { MongoMemoryReplSet } from "mongodb-memory-server";
import { createApp } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { config } from "./config/env.js";
import { startReservationExpiryJob } from "./jobs/reservations.js";
import { seedDemoData } from "./services/demoSeed.js";

const replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
await connectDatabase(replicaSet.getUri());
// Always seed demo data on dev server startup so cakes are always available
console.info("Local demo seed:", await seedDemoData());
const app = createApp();
const server = app.listen(config.port, () => console.info(`BAKEBERRY API listening on http://localhost:${config.port} with temporary MongoDB`));
const stopReservationJob = startReservationExpiryJob();

let shuttingDown = false;
async function shutdown(signal) {
	if (shuttingDown) return;
	shuttingDown = true;
	console.info(`${signal} received; shutting down temporary BAKEBERRY API`);
	stopReservationJob();
	server.close(async () => {
		await disconnectDatabase();
		await replicaSet.stop();
		process.exit(0);
	});
	setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
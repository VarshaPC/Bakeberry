import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { seedDemoData } from "../src/services/demoSeed.js";

try {
	if (process.env.NODE_ENV === "production") throw new Error("Demo seeding is disabled in production");
	await connectDatabase();
	const result = await seedDemoData();
	console.info("Demo catalogue seeded", result);
} catch (error) {
	console.error("Demo seeding failed:", error.message);
	process.exitCode = 1;
} finally {
	await disconnectDatabase();
}
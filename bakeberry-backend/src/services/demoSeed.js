import Cake from "../models/Cake.js";
import BookingSlot from "../models/BookingSlot.js";
import { minimumBookingDate } from "../utils/booking.js";

const demoCakes = [
	{ name: "Strawberry Cloud", description: "Vanilla sponge · fresh strawberry · soft cream", category: "Fruit", image: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=800&q=80", flavours: ["Vanilla", "Strawberry"], variants: [{ name: "0.5 kg", weightKg: 0.5, price: 850, stock: 5, flavours: ["Vanilla", "Strawberry"], egglessAvailable: true, instantEligible: true, advanceEligible: true }, { name: "1 kg", weightKg: 1, price: 1450, stock: 6, flavours: ["Vanilla", "Strawberry"], egglessAvailable: true, instantEligible: true, advanceEligible: true }] },
	{ name: "Dark Side of Cocoa", description: "Dark chocolate · ganache · cocoa nib", category: "Chocolate", image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80", variants: [{ name: "1 kg", weightKg: 1, price: 1650, stock: 4, flavours: ["Dark chocolate"], instantEligible: true, advanceEligible: true }, { name: "2 kg", weightKg: 2, price: 2950, stock: 2, flavours: ["Dark chocolate"], instantEligible: true, advanceEligible: true }] },
	{ name: "Lemon & Olive Oil", description: "Bright lemon · olive oil · vanilla glaze", category: "Fruit", image: "https://images.unsplash.com/photo-1519915028121-7d3463d20b13?auto=format&fit=crop&w=800&q=80", variants: [{ name: "0.5 kg", weightKg: 0.5, price: 980, stock: 3, flavours: ["Lemon"], egglessAvailable: true, instantEligible: true, advanceEligible: true }] },
	{ name: "Forest Floor", description: "Chocolate sponge · cherries · cloud cream", category: "Chocolate", image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80", variants: [{ name: "1 kg", weightKg: 1, price: 1350, stock: 0, reserved: 0, productionCapacityPerDay: 8, flavours: ["Chocolate"], instantEligible: false, advanceEligible: true }] },
	{ name: "Pistachio Rose", description: "Pistachio sponge · rose cream · berries", category: "Celebration", image: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=800&q=80", variants: [{ name: "1 kg", weightKg: 1, price: 1780, stock: 2, flavours: ["Pistachio", "Rose"], egglessAvailable: true, instantEligible: true, advanceEligible: true }] },
	{ name: "Vanilla Berry Garden", description: "Madagascar vanilla · seasonal berries", category: "Fruit", image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80", variants: [{ name: "1 kg", weightKg: 1, price: 1520, stock: 5, flavours: ["Vanilla"], egglessAvailable: true, instantEligible: true, advanceEligible: true }] },
	{ name: "Salted Caramel Daydream", description: "Brown butter · caramel · flaky sea salt", category: "Chocolate", image: "https://images.unsplash.com/photo-1542826438-bd32f43d626f?auto=format&fit=crop&w=800&q=80", variants: [{ name: "1 kg", weightKg: 1, price: 1690, stock: 1, flavours: ["Salted caramel"], instantEligible: true, advanceEligible: true }] },
	{ name: "Little Birthday Clouds", description: "Vanilla bean · hand-piped · choose your colours", category: "Celebration", image: "https://images.unsplash.com/photo-1558636508-e0db3814bd1d?auto=format&fit=crop&w=800&q=80", variants: [{ name: "1.5 kg", weightKg: 1.5, price: 2100, stock: 0, reserved: 0, productionCapacityPerDay: 8, preparationDays: 4, flavours: ["Vanilla"], egglessAvailable: true, instantEligible: false, advanceEligible: true }] }
];

export async function seedDemoData() {
	const created = [];
	for (const demo of demoCakes) {
		const cake = await Cake.findOneAndUpdate({ name: demo.name, description: { $regex: "^DEMO DATA" } }, { $set: { ...demo, description: `DEMO DATA — ${demo.description}`, images: [{ url: demo.image, alt: `${demo.name} cake (demo)` }], active: true } }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
		created.push(cake);
	}
	const firstDate = minimumBookingDate(new Date(), 3, "Asia/Kolkata");
	for (let offset = 0; offset < 14; offset += 1) {
		const date = new Date(`${firstDate}T00:00:00.000Z`);
		date.setUTCDate(date.getUTCDate() + offset);
		const dateString = date.toISOString().slice(0, 10);
		for (const slot of ["10:00-12:00", "14:00-16:00", "16:00-18:00"]) {
			await BookingSlot.updateOne({ date: dateString, slot }, { $setOnInsert: { date: dateString, slot, capacity: 8, reserved: 0, active: true } }, { upsert: true });
		}
		for (const cake of created) {
			for (const variant of cake.variants.filter((item) => item.stock === 0 && item.advanceEligible)) {
				await (await import("../models/ProductionCapacity.js")).default.updateOne({ cake: cake._id, variant: variant._id, date: dateString }, { $setOnInsert: { cake: cake._id, variant: variant._id, date: dateString, capacity: variant.productionCapacityPerDay, reserved: 0, active: true } }, { upsert: true });
			}
		}
	}
	return { cakes: created.length, dates: 14, firstDate };
}
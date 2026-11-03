import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { createApp } from "../../src/app.js";
import User from "../../src/models/User.js";
import Cake from "../../src/models/Cake.js";
import Cart from "../../src/models/Cart.js";
import BookingSlot from "../../src/models/BookingSlot.js";
import Order from "../../src/models/Order.js";
import { minimumBookingDate } from "../../src/utils/booking.js";
import { createAccessToken } from "../../src/utils/tokens.js";

let replicaSet;
let app;
let accessToken;
let cake;
let variant;
let bookingDate;
let userId;

before(async () => {
	replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
	await mongoose.connect(replicaSet.getUri());
	app = createApp();
	bookingDate = minimumBookingDate(new Date(), 3, "Asia/Kolkata");
});

after(async () => {
	await mongoose.disconnect();
	await replicaSet?.stop();
});

test("customer can sign up, price a cart, checkout atomically and retry idempotently", async () => {
	const signup = await request(app).post("/api/v1/auth/signup").send({
		name: "Asha Rao",
		email: "asha@example.com",
		phone: "+919876543210",
		password: "a-long-secure-password",
		confirmPassword: "a-long-secure-password"
	});
	assert.equal(signup.status, 201, JSON.stringify(signup.body));
	accessToken = signup.body.accessToken;
	userId = signup.body.user.id;
	assert.ok(signup.headers["set-cookie"].some((cookie) => cookie.includes("bakeberry_refresh")));

	cake = await Cake.create({
		name: "Integration Chocolate Cake",
		description: "Test cake",
		category: "Chocolate",
		images: [{ url: "https://example.test/cake.jpg", alt: "Chocolate cake" }],
		variants: [{ name: "1 kg", weightKg: 1, price: 1800, stock: 1, reserved: 0, preparationDays: 0, flavours: ["Chocolate"], instantEligible: true, advanceEligible: true, productionCapacityPerDay: 5 }]
	});
	variant = cake.variants[0];
	await BookingSlot.create({ date: bookingDate, slot: "14:00-16:00", capacity: 2, reserved: 0 });
	const catalogue = await request(app).get("/api/v1/cakes?category=Chocolate&search=Integration&page=1&limit=10");
	assert.equal(catalogue.status, 200, JSON.stringify(catalogue.body));
	assert.equal(catalogue.body.items.length, 1);
	assert.equal(catalogue.body.items[0]._id, cake.id);

	const addToCart = await request(app).post("/api/v1/cart/items").set("Authorization", `Bearer ${accessToken}`).send({ cakeId: cake.id, variantId: variant.id, quantity: 1, flavour: "Chocolate" });
	assert.equal(addToCart.status, 200, JSON.stringify(addToCart.body));
	assert.equal(addToCart.body.subtotal, 1800);
	assert.ok(addToCart.body.items[0].id, "Cart response must return a subdocument ID for update/delete");
	const updatedCart = await request(app).patch(`/api/v1/cart/items/${addToCart.body.items[0].id}`).set("Authorization", `Bearer ${accessToken}`).send({ quantity: 1 });
	assert.equal(updatedCart.status, 200, JSON.stringify(updatedCart.body));

	const checkoutPayload = { fulfillment: "pickup", date: bookingDate, slot: "14:00-16:00" };
	const first = await request(app).post("/api/v1/checkout").set("Authorization", `Bearer ${accessToken}`).set("Idempotency-Key", "integration-checkout-001").send(checkoutPayload);
	assert.equal(first.status, 201, JSON.stringify(first.body));
	assert.equal(first.body.order.total, 1800);
	assert.equal(first.body.order.orderStatus, "pending_payment");

	const retry = await request(app).post("/api/v1/checkout").set("Authorization", `Bearer ${accessToken}`).set("Idempotency-Key", "integration-checkout-001").send(checkoutPayload);
	assert.equal(retry.status, 200, JSON.stringify(retry.body));
	assert.equal(retry.body.replayed, true);
	assert.equal(retry.body.order._id, first.body.order._id);

	const savedCake = await Cake.findById(cake.id).lean();
	assert.equal(savedCake.variants[0].stock, 1);
	assert.equal(savedCake.variants[0].reserved, 1);
	assert.equal(await Order.countDocuments({ user: userId }), 1);
	assert.equal((await Cart.findOne({ user: userId })).items.length, 0);
});

test("customer order lookup does not expose another user's orders", async () => {
	const order = await Order.findOne({ user: userId }).lean();
	const otherUser = await User.create({ name: "Other Customer", email: "other@example.com", phone: "+919876543211", passwordHash: "not-used" });
	const token = createAccessToken(otherUser);
	const response = await request(app).get(`/api/v1/orders/${order._id}`).set("Authorization", `Bearer ${token}`);
	assert.equal(response.status, 404);
	assert.equal(response.body.error.code, "ORDER_NOT_FOUND");
});

test("admin stock adjustment cannot reduce stock below checkout reservations", async () => {
	const admin = await User.create({ name: "BAKEBERRY Admin", email: "admin@example.com", phone: "+919876543212", passwordHash: "not-used", role: "admin" });
	const token = createAccessToken(admin);
	const blocked = await request(app).patch(`/api/v1/admin/inventory/${cake.id}/${variant.id}`).set("Authorization", `Bearer ${token}`).send({ stock: 0, reason: "Attempt below reserved quantity" });
	assert.equal(blocked.status, 409, JSON.stringify(blocked.body));
	assert.equal(blocked.body.error.code, "STOCK_BELOW_RESERVED");
	const allowed = await request(app).patch(`/api/v1/admin/inventory/${cake.id}/${variant.id}`).set("Authorization", `Bearer ${token}`).send({ stock: 1, reason: "Confirm current stock" });
	assert.equal(allowed.status, 200, JSON.stringify(allowed.body));
	assert.equal(allowed.body.available, 0);
});

test("customer can cancel an unpaid order and release its reservations", async () => {
	const order = await Order.findOne({ user: userId }).lean();
	const cancelled = await request(app).post(`/api/v1/orders/${order._id}/cancel`).set("Authorization", `Bearer ${accessToken}`).send({ reason: "Changed my plans" });
	assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));
	assert.equal(cancelled.body.order.orderStatus, "cancelled");
	const savedCake = await Cake.findById(cake.id).lean();
	assert.equal(savedCake.variants[0].reserved, 0);
	const slot = await BookingSlot.findOne({ date: bookingDate, slot: "14:00-16:00" }).lean();
	assert.equal(slot.reserved, 0);
});
import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import Cart from "../models/Cart.js";
import Cake from "../models/Cake.js";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/errors.js";
import { priceCart } from "../services/cart.js";

const router = Router();
router.use(requireAuth);
const validate = (req, _res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) return next(new ApiError(422, "VALIDATION_ERROR", "Please check the submitted fields", errors.array().map(({ path, msg }) => ({ field: path, message: msg }))));
	next();
};

router.get("/", async (req, res, next) => {
	try {
		const cart = await Cart.findOne({ user: req.user.id }).populate("items.cake", "name images category");
		const priced = await priceCart(cart);
		res.json({ items: priced.items, subtotal: priced.subtotal, currency: priced.currency });
	} catch (error) { next(error); }
});

router.post("/items", body("cakeId").isMongoId(), body("variantId").isMongoId(), body("quantity").isInt({ min: 1, max: 50 }), body("flavour").optional().isString().isLength({ max: 50 }), body("customization").optional().isString().isLength({ max: 300 }), validate, async (req, res, next) => {
	try {
		const cake = await Cake.findOne({ _id: req.body.cakeId, active: true }).lean();
		const variant = cake?.variants.find((entry) => entry._id.toString() === req.body.variantId && entry.active);
		if (!variant) throw new ApiError(404, "VARIANT_NOT_FOUND", "Cake or size is unavailable");
		if (req.body.flavour && !variant.flavours.includes(req.body.flavour)) throw new ApiError(422, "INVALID_FLAVOUR", "Selected flavour is unavailable");
		const cart = await Cart.findOneAndUpdate({ user: req.user.id }, { $setOnInsert: { user: req.user.id } }, { new: true, upsert: true });
		const existing = cart.items.find((item) => item.cake.toString() === req.body.cakeId && item.variant.toString() === req.body.variantId && item.flavour === req.body.flavour && item.customization === req.body.customization);
		if (existing) existing.quantity = Math.min(50, existing.quantity + Number(req.body.quantity));
		else cart.items.push({ cake: req.body.cakeId, variant: req.body.variantId, quantity: Number(req.body.quantity), flavour: req.body.flavour, customization: req.body.customization });
		await cart.save();
		const priced = await priceCart(cart);
		res.status(200).json({ items: priced.items, subtotal: priced.subtotal, currency: priced.currency });
	} catch (error) { next(error); }
});

router.patch("/items/:itemId", param("itemId").isMongoId(), body("quantity").isInt({ min: 1, max: 50 }), validate, async (req, res, next) => {
	try {
		const cart = await Cart.findOne({ user: req.user.id });
		const item = cart?.items.id(req.params.itemId);
		if (!item) throw new ApiError(404, "CART_ITEM_NOT_FOUND", "Cart item was not found");
		item.quantity = Number(req.body.quantity);
		await cart.save();
		const priced = await priceCart(cart);
		res.json({ items: priced.items, subtotal: priced.subtotal, currency: priced.currency });
	} catch (error) { next(error); }
});

router.delete("/items/:itemId", param("itemId").isMongoId(), validate, async (req, res, next) => {
	try {
		const cart = await Cart.findOne({ user: req.user.id });
		const item = cart?.items.id(req.params.itemId);
		if (!item) throw new ApiError(404, "CART_ITEM_NOT_FOUND", "Cart item was not found");
		item.deleteOne();
		await cart.save();
		const priced = await priceCart(cart);
		res.json({ items: priced.items, subtotal: priced.subtotal, currency: priced.currency });
	} catch (error) { next(error); }
});

router.delete("/", async (req, res, next) => {
	try { await Cart.findOneAndUpdate({ user: req.user.id }, { $set: { items: [] } }); res.status(204).end(); }
	catch (error) { next(error); }
});

export default router;
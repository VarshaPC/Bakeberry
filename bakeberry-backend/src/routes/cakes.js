import { Router } from "express";
import Cake from "../models/Cake.js";
import { ApiError } from "../middleware/errors.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", async (req, res, next) => {
	try {
		const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
		const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
		const filter = { active: true, "variants.active": true };
		if (typeof req.query.category === "string" && req.query.category.trim()) filter.category = req.query.category.trim();
		if (typeof req.query.search === "string" && req.query.search.trim()) filter.$text = { $search: req.query.search.trim().slice(0, 100) };
		const [cakes, total] = await Promise.all([
			Cake.find(filter).select("name description category images variants active").skip((page - 1) * limit).limit(limit).lean(),
			Cake.countDocuments(filter)
		]);
		res.json({ items: cakes.map((cake) => ({ ...cake, variants: cake.variants.filter((variant) => variant.active) })), page, limit, total, pages: Math.ceil(total / limit) });
	} catch (error) { next(error); }
});

router.get("/:id", async (req, res, next) => {
	try {
		const cake = await Cake.findOne({ _id: req.params.id, active: true }).lean();
		if (!cake) throw new ApiError(404, "CAKE_NOT_FOUND", "Cake was not found");
		cake.variants = cake.variants.filter((variant) => variant.active);
		res.json({ cake });
	} catch (error) { next(error); }
});

router.post("/", requireAuth, requireRole("admin"), async (req, res, next) => {
	try {
		const cake = await Cake.create(req.body);
		res.status(201).json({ cake });
	} catch (error) { next(error); }
});

router.patch("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
	try {
		const cake = await Cake.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
		if (!cake) throw new ApiError(404, "CAKE_NOT_FOUND", "Cake was not found");
		res.json({ cake });
	} catch (error) { next(error); }
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
	try {
		const cake = await Cake.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
		if (!cake) throw new ApiError(404, "CAKE_NOT_FOUND", "Cake was not found");
		res.json({ cake });
	} catch (error) { next(error); }
});

export default router;
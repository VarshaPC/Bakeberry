import Cake from "../models/Cake.js";
import { ApiError } from "../middleware/errors.js";

export async function priceCart(cart) {
	const items = [];
	let subtotal = 0;
	for (const item of cart?.items ?? []) {
		const cake = await Cake.findOne({ _id: item.cake, active: true }).lean();
		const variant = cake?.variants.find((entry) => entry._id.toString() === item.variant.toString() && entry.active);
		if (!variant) throw new ApiError(409, "ITEM_UNAVAILABLE", "A cart item is no longer available");
		if (item.flavour && !variant.flavours.includes(item.flavour)) throw new ApiError(422, "INVALID_FLAVOUR", "A selected flavour is not available for this cake size");
		const unitPrice = variant.price;
		const lineTotal = unitPrice * item.quantity;
		subtotal += lineTotal;
		items.push({ id: item._id.toString(), cakeId: cake._id.toString(), variantId: variant._id.toString(), name: cake.name, variantName: variant.name, quantity: item.quantity, unitPrice, lineTotal, flavour: item.flavour, customization: item.customization, stock: Math.max(0, variant.stock - variant.reserved) });
	}
	return { items, subtotal, currency: "INR" };
}
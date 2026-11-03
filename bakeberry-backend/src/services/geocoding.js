import { config } from "../config/env.js";
import { ApiError } from "../middleware/errors.js";
import { isValidCoordinates } from "../utils/distance.js";

export async function geocodeAddress(address, { apiKey = config.geocodingApiKey, fetchImpl = fetch } = {}) {
	if (!apiKey) throw new ApiError(503, "GEOCODING_NOT_CONFIGURED", "Delivery address verification is not configured yet");
	const query = [address.line1, address.line2, address.city, address.postalCode, "India"].filter(Boolean).join(", ");
	const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
	url.searchParams.set("address", query);
	url.searchParams.set("key", apiKey);
	let response;
	try {
		response = await fetchImpl(url, { signal: AbortSignal.timeout(5000) });
	} catch {
		throw new ApiError(503, "GEOCODING_UNAVAILABLE", "Delivery address could not be verified right now");
	}
	if (!response.ok) throw new ApiError(503, "GEOCODING_UNAVAILABLE", "Delivery address could not be verified right now");
	const result = await response.json();
	const location = result.status === "OK" ? result.results?.[0]?.geometry?.location : null;
	const coordinates = location ? { latitude: location.lat, longitude: location.lng } : null;
	if (!isValidCoordinates(coordinates)) throw new ApiError(422, "ADDRESS_NOT_FOUND", "We could not verify that delivery address. Check the address or choose pickup.");
	return coordinates;
}
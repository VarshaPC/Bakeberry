export function shopDate(date = new Date(), timezone = "Asia/Kolkata") {
	const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
	const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
	return `${values.year}-${values.month}-${values.day}`;
}

export function minimumBookingDate(now = new Date(), minimumDays = 3, timezone = "Asia/Kolkata") {
	const [year, month, day] = shopDate(now, timezone).split("-").map(Number);
	const date = new Date(Date.UTC(year, month - 1, day + minimumDays));
	return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function isValidDateOnly(value) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const date = new Date(`${value}T00:00:00.000Z`);
	return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function validateBookingDate(date, { now = new Date(), minimumDays = 3, timezone = "Asia/Kolkata", preparationDays = 0 } = {}) {
	if (!isValidDateOnly(date)) return { valid: false, earliestDate: minimumBookingDate(now, Math.max(minimumDays, preparationDays), timezone), reason: "INVALID_DATE" };
	const earliestDate = minimumBookingDate(now, Math.max(minimumDays, preparationDays), timezone);
	return date >= earliestDate ? { valid: true, earliestDate } : { valid: false, earliestDate, reason: "LEAD_TIME_REQUIRED" };
}
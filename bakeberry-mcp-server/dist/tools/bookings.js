import { apiClient } from "../services/api-client.js";
import { formatBookingAvailability } from "../utils/formatters.js";
import { config } from "../config.js";
function getShopDate(date = new Date(), timezone = config.shopTimezone) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}-${values.month}-${values.day}`;
}
function getEarliestBookingDate(minimumDays = config.minBookingDays, timezone = config.shopTimezone) {
    const [year, month, day] = getShopDate(new Date(), timezone).split("-").map(Number);
    const d = new Date(Date.UTC(year, month - 1, day + minimumDays));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
export const checkBookingAvailabilityTool = {
    name: "check_booking_availability",
    description: "Check booking availability for a date or date range at BAKEBERRY. Preserves the minimum 3-day advance notice rule (Asia/Kolkata timezone). Can also validate a specific cake variant and slot.",
    inputSchema: {
        type: "object",
        properties: {
            date: {
                type: "string",
                description: "Target booking date in YYYY-MM-DD format (e.g. 2026-11-10)",
            },
            endDate: {
                type: "string",
                description: "Optional end date in YYYY-MM-DD format for range queries. Defaults to the same as 'date'",
            },
            cakeId: {
                type: "string",
                description: "Optional MongoDB ID of the cake to validate eligibility",
            },
            variantId: {
                type: "string",
                description: "Optional MongoDB ID of the cake variant",
            },
            slot: {
                type: "string",
                description: "Optional slot name (e.g. '10:00 - 13:00' or '14:00 - 18:00')",
            },
        },
        required: ["date"],
    },
    handler: async (args) => {
        try {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: "Invalid date format. Please provide a valid date in YYYY-MM-DD format.",
                        },
                    ],
                };
            }
            const earliestDate = getEarliestBookingDate();
            const from = args.date;
            const to = args.endDate || args.date;
            if (args.endDate && args.endDate < args.date) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: "Invalid date range: 'endDate' cannot be before 'date'.",
                        },
                    ],
                };
            }
            // Check lead time warning
            let notice = "";
            if (from < earliestDate) {
                notice = `⚠️ Warning: The requested date ${from} does not satisfy BAKEBERRY's minimum ${config.minBookingDays}-calendar-day advance notice requirement. The earliest eligible advance booking date is ${earliestDate}.\n\n`;
            }
            // If specific cake validation requested:
            if (args.cakeId && args.variantId && args.slot) {
                const validationResult = await apiClient.post("/bookings/validate", {
                    cakeId: args.cakeId,
                    variantId: args.variantId,
                    date: args.date,
                    slot: args.slot,
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: `${notice}✅ Booking slot is valid and available!\n- Date: ${validationResult.date}\n- Slot: ${validationResult.slot}\n- Remaining capacity: ${validationResult.remaining} slots`,
                        },
                    ],
                };
            }
            // General availability query
            const data = await apiClient.get("/availability", {
                from,
                to,
            });
            const formatted = formatBookingAvailability(data.slots, from, to, earliestDate);
            return {
                content: [
                    {
                        type: "text",
                        text: `${notice}${formatted}`,
                    },
                ],
            };
        }
        catch (error) {
            return {
                isError: true,
                content: [
                    {
                        type: "text",
                        text: `Error checking booking availability: ${error.message || String(error)}`,
                    },
                ],
            };
        }
    },
};
//# sourceMappingURL=bookings.js.map
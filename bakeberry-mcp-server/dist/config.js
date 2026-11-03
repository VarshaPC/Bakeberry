import dotenv from "dotenv";
dotenv.config();
export const config = {
    apiUrl: process.env.BAKEBERRY_API_URL || "http://127.0.0.1:4000/api/v1",
    adminToken: process.env.BAKEBERRY_ADMIN_TOKEN,
    customerToken: process.env.BAKEBERRY_CUSTOMER_TOKEN,
    shopTimezone: process.env.SHOP_TIMEZONE || "Asia/Kolkata",
    minBookingDays: Number(process.env.SHOP_MIN_BOOKING_DAYS || 3),
};
//# sourceMappingURL=config.js.map
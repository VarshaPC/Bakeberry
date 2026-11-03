# BAKEBERRY Backend

Single-shop ordering API built with Node.js 20+, Express 4, MongoDB/Mongoose, JWT, and bcrypt. The React/Vite storefront is in the workspace root; this backend remains isolated in `bakeberry-backend/`.

## Implemented modules

- Authentication: signup, login, refresh rotation, logout, profile, saved addresses, password changes, and password reset.
- Public active cake catalogue with category/search pagination; admin-only cake create/update/deactivate.
- Persisted customer carts with server-side price calculation and variant/flavour validation.
- Shop-local booking date validation, booking slot availability, and configurable admin slots.
- Idempotent checkout with MongoDB transactions, ready-stock reservation, dated production-capacity reservation for made-to-order products, 15-minute payment reservations, customer order history, and ownership checks.
- Razorpay order creation, backend signature verification, webhook signature verification/idempotency, and payment finalization.
- Admin/staff order transitions, inventory operations, production capacity, audit events, and sales summary endpoints.
- Reservation expiry worker, request IDs, security headers, CORS, rate limiting, central errors, health endpoint, and development notification adapter.
- React storefront API integration for live catalogue/search, guest cart migration, account sessions, server cart pricing, booking slots, pickup checkout, orders, and Razorpay Checkout.js handoff.

Provider integrations, shop-specific fees/location/policies, and deployment credentials still need owner configuration. This code is not production-ready until the operational checklist is completed.

## Requirements

- Node.js 20 or newer and npm.
- A persistent MongoDB **replica set** for `npm start` and data that must survive restarts. Order, payment, stock, and slot operations use MongoDB transactions; a standalone local MongoDB process is insufficient.
- Razorpay account/test keys for online payment tests. Without configured keys, payment routes fail closed.

### Local MongoDB replica set

For an existing local MongoDB installation, start `mongod` with a replica set, then initialize it once in `mongosh`:

```javascript
rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "127.0.0.1:27017" }] })
```

Confirm `rs.status()` reports a primary. For a hosted environment, use a MongoDB Atlas replica set and its connection string. Never commit database credentials.

## Install and run

```powershell
cd bakeberry-backend
npm install
Copy-Item .env.example .env
```

For quick local UI/API development, `npm run dev` starts a temporary in-memory MongoDB replica set and the API in watch mode. Its data is discarded when the process exits. Use `npm run dev:demo` to also seed clearly marked sample cakes and 14 days of booking slots. Set strong, different `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` values in `.env`; the template defaults are development-only. For persistent data, configure `MONGODB_URI` and use `npm start`. For local frontend requests, keep `http://127.0.0.1:5500` in `CORS_ORIGINS` and `FRONTEND_URL`.

In a second terminal at the workspace root, run `npm install` once and then `npm run dev` to serve the React app at `http://127.0.0.1:5500`. Set `VITE_API_URL=http://127.0.0.1:4000/api/v1` in the frontend `.env` if you need to change the API URL. Use the same `127.0.0.1` hostname for both local servers so the HttpOnly refresh cookie remains same-site. Then:

```powershell
npm test
npm run dev
```

The API listens on `http://localhost:4000`. Health check: `GET /api/v1/health`.

The connected React storefront loads at `http://127.0.0.1:5500`. Demo cakes are marked `DEMO DATA` and exist only in the temporary in-memory database. Payment checkout requires Razorpay test keys; without them, the frontend cancels the unpaid reservation and restores the items to the authenticated cart.

## Configuration

Required before production: `MONGODB_URI`, distinct JWT secrets (32+ characters), `COOKIE_SECURE=true`, explicit production `CORS_ORIGINS`, HTTPS, and a persistent MongoDB replica set. Keep `.env` private.

Shop settings include `SHOP_TIMEZONE=Asia/Kolkata`, `SHOP_CURRENCY=INR`, and `SHOP_MIN_BOOKING_DAYS=3`. Set real `SHOP_LATITUDE`, `SHOP_LONGITUDE`, `SHOP_DELIVERY_RADIUS_KM`, and `SHOP_DELIVERY_FEE` before enabling delivery checkout. Set `GEOCODING_API_KEY` to enable server-side Google address resolution for a saved customer address; the backend does not trust coordinates supplied by the browser and fails closed without a geocoding key. No fictional shop location, tax, fee, ETA, or holiday calendar is seeded.

Payment requires `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`; use test credentials first. Configure the webhook URL as `/api/v1/payments/webhook` and subscribe to captured/failed payment events. Never trust the browser callback without server verification; do not send secret credentials to the browser.

The notification adapter logs reset links only in development. A production email/SMS provider and verification workflow must be configured before enabling customer-facing reset or order notifications. Image upload storage (such as Cloudinary), tax/coupon policy, shop holidays/opening hours, cancellation/refunds, and delivery staffing integrations remain follow-up configuration/modules.

## API overview

All routes are under `/api/v1`. Protected routes use `Authorization: Bearer <accessToken>`. Refresh tokens are rotated in an HttpOnly cookie scoped to `/api/v1/auth`.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | Public | Service health |
| POST | `/auth/signup` | Public | Create a customer account |
| POST | `/auth/login` | Public | Login |
| POST | `/auth/refresh` | Refresh cookie | Rotate refresh session |
| POST | `/auth/logout` | Public | Revoke refresh session and clear cookie |
| GET/PATCH | `/auth/me` | Customer | View/update profile |
| POST | `/auth/me/addresses` | Customer | Save a delivery address |
| POST | `/auth/change-password` | Customer | Change password and revoke refresh session |
| POST | `/auth/forgot-password`, `/auth/reset-password` | Public | Password reset flow |
| GET | `/cakes` | Public | Browse/search/filter active cakes |
| GET | `/cakes/:id` | Public | Cake details |
| POST/PATCH/DELETE | `/cakes` or `/cakes/:id` | Admin | Manage catalogue; DELETE deactivates |
| GET/POST/DELETE | `/cart` and `/cart/items` | Customer | Read, add, remove cart items |
| PATCH/DELETE | `/cart/items/:itemId` | Customer | Change quantity or remove item |
| GET | `/availability?from=YYYY-MM-DD&to=YYYY-MM-DD` | Public | Configured booking slots |
| POST | `/bookings/validate` | Public | Validate cake/variant/date/slot |
| POST | `/checkout` | Customer | Create idempotent pending order and reserve stock/capacity |
| GET | `/orders`, `/orders/:id` | Customer | Own order history/details |
| POST | `/payments/create` | Customer | Create Razorpay payment order for own pending order |
| POST | `/payments/verify` | Customer | Verify Razorpay signature and finalize order |
| POST | `/payments/webhook` | Razorpay | Verify/process signed provider event |
| GET | `/admin/dashboard`, `/admin/orders`, `/admin/inventory` | Admin/staff | Operational views |
| PATCH | `/admin/orders/:id/status` | Admin/staff | Validate and update order state |
| PATCH | `/admin/inventory/:cakeId/:variantId` | Admin/staff | Set ready stock with reason/audit event |
| PUT | `/admin/booking-slots`, `/admin/production-capacity` | Admin/staff | Configure date/slot capacity |
| GET | `/admin/reports/sales` | Admin/staff | Paid revenue and best sellers |

Errors use `{ "error": { "code": "...", "message": "...", "details": [] } }`. Checkout requires an `Idempotency-Key` header with 8–100 characters. The server ignores client-submitted totals.

### Example requests

Signup:

```http
POST /api/v1/auth/signup
Content-Type: application/json

{"name":"Asha Rao","email":"asha@example.com","phone":"+919876543210","password":"use-a-long-unique-password","confirmPassword":"use-a-long-unique-password"}
```

Add a cart item (IDs come from catalogue response):

```http
POST /api/v1/cart/items
Authorization: Bearer <accessToken>
Content-Type: application/json

{"cakeId":"<cakeId>","variantId":"<variantId>","quantity":1,"flavour":"Chocolate"}
```

Checkout:

```http
POST /api/v1/checkout
Authorization: Bearer <accessToken>
Idempotency-Key: bakeberry-checkout-unique-001
Content-Type: application/json

{"fulfillment":"pickup","date":"2026-10-30","slot":"14:00-16:00"}
```

If valid, checkout creates a `pending_payment` order and returns a 15-minute reservation. Create a Razorpay order with its returned `order._id`, then verify the browser-provided Razorpay order/payment/signature values at the backend. Do not mark the order paid from client-side state.

## Inventory and booking policy

- Ready inventory is reserved atomically inside the checkout transaction. A confirmed payment decrements stock and releases the reservation.
- Made-to-order items with insufficient ready stock require `advanceEligible` and dated `ProductionCapacity` records. Those reservations are separate from ready stock.
- Each checkout also reserves one configured `BookingSlot` for the order date/time.
- Unpaid orders expire after 15 minutes; the in-process expiry worker releases ready stock, production capacity, and slot reservations. Run a single API instance until a distributed queue/lock is configured.
- The server validates the minimum calendar lead time in `SHOP_TIMEZONE`, including a cake variant's longer `preparationDays`.

## Tests and API collection

```powershell
npm test
```

Unit tests cover timezone cutoffs, lead times, coordinate validation, environment rules, and base API behavior. Database concurrency, full auth, and payment integration tests require MongoDB replica-set and provider sandbox configuration; they are not represented as passing in this initial suite. Import `postman/BAKEBERRY.postman_collection.json` into Postman and configure the environment in `postman/BAKEBERRY.local.postman_environment.json`.

## Production checklist

- Provision MongoDB replica set and backup/restore policy; use TLS and restrict network access.
- Supply real shop coordinates, fee, currency/tax/legal policies, booking hours/capacity, holidays, and cancellation/refund policy.
- Configure the payment provider, webhook secret, notification sender, image storage, geocoding/address validation, and production CORS origin.
- Create the first administrator through a controlled provisioning script or direct protected operator workflow; public signup always assigns `customer` role.
- Use a distributed job queue/lock for multiple API replicas, central structured logs, monitoring, alerting, and rate-limit storage.
- Complete security review and integration/concurrency testing before accepting real customer orders.

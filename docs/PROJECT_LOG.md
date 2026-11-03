# BAKEBERRY Project Log

**Last updated:** 2026-10-22  
**Project type:** Single-shop cake ordering and advance-booking website  
**Workspace:** React/Vite frontend with a Node.js/Express/MongoDB backend

## Project Purpose

BAKEBERRY is an online storefront for one cake shop. Customers can browse cakes, create an account, manage a cart, book pickup dates, check order status, and pay through the configured payment provider. Shop inventory, pricing, orders, and administration belong to BAKEBERRY alone.

The system must not become a multi-vendor marketplace. Do not add nearby-shop search, seller accounts, vendor listings, or multi-shop administration.

## Prompt History

### Storefront brief

The initial website prompt requested a premium responsive bakery storefront with cake discovery, product details, account access, a cart, booking at least three calendar days ahead, stock and availability, instant delivery within 3 km, secure payment, order tracking, and owner administration. It also specified that customers may browse without signing in but must authenticate before confirming an order or booking.

### Backend brief

The backend prompt requested Node.js, Express, MongoDB/Mongoose, JWT authentication, bcrypt password hashing, validation, security middleware, and a modular API for catalogue, inventory, cart, booking, checkout, payments, orders, delivery, admin operations, and notifications. Important requirements included server-owned pricing, transaction-safe stock reservations, idempotent order creation, payment verification, role checks, customer order ownership, tests, Postman assets, and setup documentation.

### React conversion brief

The frontend conversion prompt requested React with Vite, JavaScript/JSX, reusable components, React Router, Axios, and preservation of the existing visual design and backend. It requested pages for home, cakes, cake details, login/signup, profile, booking, cart, checkout, confirmation, orders/tracking, and the admin dashboard where supported.

### Vercel deployment prompt

The Vercel prompt suggested deploying the frontend and Express API as separate Vercel services, with public rewrites and service bindings for server-to-server calls. The code review found that React calls the API from the browser, so the current architecture has no server-to-server call requiring a binding. No Vercel services configuration has been committed. Service names, public routes, and hosting target still need confirmation before configuring it.

## Conversation and Implementation Timeline

1. The workspace initially contained three static files: `index.html`, `styles.css`, and `New.js`. The HTML was an unrelated sign-in screen.
2. The static page was replaced with a BAKEBERRY bakery storefront, preserving a premium visual style and adding local demo interactions.
3. A sibling `bakeberry-backend/` project was created with Express, Mongoose, authentication, catalogue/cart/booking/checkout/order/payment/admin routes, tests, Postman files, and README documentation.
4. MongoDB was not initially listening locally. A development-only server was added to use an in-memory MongoDB replica set; `npm run dev:demo` also seeds sample cakes and booking slots. Its data is temporary.
5. The storefront was connected to the backend APIs, including live catalogue/search, guest cart migration, account sessions, booking slots, pickup checkout, order history, and payment handoff.
6. The storefront was converted to React/Vite with routed pages, reusable components, auth/cart contexts, and Axios service modules. The previous imperative `New.js` and `api.js` were removed after their functionality moved into React.
7. A module MIME error occurred when the React entry was served by a hand-written static server that labelled JSX as `application/octet-stream`. Vite now serves the app on port 5500 and serves `/src/main.jsx` as `text/javascript`.
8. A Vercel multi-service setup was investigated but not applied. The user then asked to save this project record as a Markdown file.

## Current Project Structure

### Frontend at the workspace root

- `index.html` — Vite HTML shell and React root.
- `vite.config.js` — Vite configuration; development host is `127.0.0.1:5500`.
- `package.json`, `package-lock.json` — React/Vite dependencies and frontend scripts.
- `.env.example` — frontend API URL template.
- `styles.css` — original BAKEBERRY design system and responsive styling.
- `src/main.jsx` — React entrypoint and global stylesheet imports.
- `src/App.jsx` — router, shared layout, and context providers.
- `src/components/` — site header/footer, home sections, cake grid/cards, protected route, error boundary.
- `src/contexts/` — authentication and cart state.
- `src/pages/` — home, catalogue, cake detail, auth, profile, booking, cart, checkout, orders, order detail/tracking, admin overview, delivery.
- `src/services/` — Axios API client and auth/cake/cart/booking/order/admin services.
- `src/app.css` — page-level styling extending the existing design.
- `tests/services.test.js` — frontend service contract tests.

### Backend in `bakeberry-backend/`

- `src/app.js` — Express app, middleware, and route registration.
- `src/server.js` — persistent MongoDB server entrypoint.
- `src/dev-server.js` — in-memory replica-set development entrypoint.
- `src/config/` — environment and MongoDB configuration.
- `src/models/` — user, cake, cart, slot, production capacity, order, payment, audit schemas.
- `src/routes/` — auth, cakes, cart, bookings, orders, payments, admin, health.
- `src/services/` — cart pricing, geocoding, notifications, demo seeding.
- `src/jobs/reservations.js` — unpaid reservation expiry worker.
- `scripts/seed-demo.js` — optional demo seed for a persistent development database.
- `tests/` — unit and MongoDB replica-set integration tests.
- `postman/` — API collection and local environment template.
- `.env.example`, `.gitignore`, `README.md` — configuration template and setup/deployment documentation.

## Architecture and Decisions

- **Business model:** one BAKEBERRY shop only.
- **Frontend:** React 18, Vite, JavaScript/JSX, React Router, Axios. Existing CSS and design are retained.
- **Backend:** Node.js 20+, Express 4, MongoDB/Mongoose, bcrypt, JWT, validation/security middleware.
- **Database:** MongoDB replica set is required for transactions. Production data must use a persistent database such as MongoDB Atlas, not the in-memory development database.
- **Local URLs:** frontend `http://127.0.0.1:5500`; backend `http://127.0.0.1:4000`.
- **API base:** `VITE_API_URL`, defaulting in code to `http://127.0.0.1:4000/api/v1`.
- **Authentication:** access token held in memory; rotating refresh token in an HttpOnly cookie. Do not store bearer tokens in localStorage or sessionStorage.
- **Cart:** guests may browse and keep a local guest cart; after sign-in it is synchronized to the backend cart.
- **Pricing:** checkout totals are calculated by the backend, not trusted from the browser.
- **Booking:** minimum three calendar days in `Asia/Kolkata`, validated by the server along with availability and slots.
- **Inventory:** checkout reserves ready stock or dated made-to-order capacity inside a MongoDB transaction. Unpaid orders expire; payment confirmation is backend-verified.
- **Delivery:** API fails closed until real shop coordinates, fee, and server-side geocoding are configured. Do not invent these values.
- **Payments:** Razorpay is integrated behind backend verification. Test credentials are required to complete online payment.
- **Service bindings:** none are currently needed because the browser calls the public API directly. If a server-side frontend function later calls the backend, revisit Vercel bindings.
- **Deployment recommendation discussed:** Vercel for the frontend, a persistent Node host such as Render/Railway for the API, and MongoDB Atlas. A unified Vercel services deployment remains an option, but has not been configured or confirmed.

## API Routes Used by the React App

The React services call these existing routes under `/api/v1`:

| Feature | API routes |
| --- | --- |
| Account | `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET/PATCH /auth/me` |
| Addresses/profile | `POST /auth/me/addresses`, `POST /auth/change-password` |
| Cakes | `GET /cakes`, `GET /cakes/:id` |
| Cart | `GET/DELETE /cart`, `POST /cart/items`, `PATCH/DELETE /cart/items/:itemId` |
| Booking | `GET /availability`, `POST /bookings/validate` |
| Checkout/orders | `POST /checkout`, `GET /orders`, `GET /orders/:id`, `POST /orders/:id/cancel` |
| Payments | `POST /payments/create`, `POST /payments/verify`, `POST /payments/webhook` |
| Admin | `GET /admin/dashboard`, `GET /admin/orders`, `PATCH /admin/orders/:id/status`, `GET/PATCH /admin/inventory`, booking/production capacity routes, sales reports |

Booking confirmation currently proceeds through authenticated pickup checkout; there is no separate booking-create endpoint. The React app exposes the existing admin overview, not a complete product/order-management console.

## Development Workflow

### Start the backend

From `bakeberry-backend/`:

```powershell
npm install
npm run dev:demo
```

This starts a temporary in-memory MongoDB replica set, seeds clearly marked demo cakes and booking slots, and runs the Express API. Data disappears when the process exits.

For persistent development/production, configure `MONGODB_URI` for a replica set and use `npm start`. Never use the demo seed for production data.

### Start the frontend

From the workspace root, in a separate terminal:

```powershell
npm install
npm run dev
```

Vite serves the React app at `http://127.0.0.1:5500`.

### Tests and production build

Frontend, from workspace root:

```powershell
npm test
npm run build
```

Backend, from `bakeberry-backend/`:

```powershell
npm test
```

## Verification History

Last recorded validation before this document was saved:

- Frontend service tests: **3 passed**.
- Backend tests: **13 passed**, including replica-set integration coverage for signup, catalogue, cart pricing/update, transactional checkout/idempotency, order ownership, reserved-stock protection, and cancellation release.
- Vite production build: **passed**.
- Browser checks: React page loaded on port 5500; API-backed catalogue, search, product details, guest cart, signup, guest-cart migration, booking availability, and protected-route redirect were exercised.
- MIME check: Vite serves `/src/main.jsx` as `text/javascript` on port 5500. Do not serve this React project through the old handwritten static-file server or open `index.html` via `file://`.

## Configuration Required Before Production

Set secrets in the hosting provider’s environment settings, not in source control:

- `MONGODB_URI` for the persistent replica set.
- Strong, distinct `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
- `COOKIE_SECURE=true`, production `CORS_ORIGINS`, HTTPS domains, and correct `FRONTEND_URL`.
- Razorpay test/live keys and webhook secret, only when ready to accept payments.
- Real shop latitude/longitude, delivery fee/radius, and `GEOCODING_API_KEY` before enabling delivery.
- Production email/SMS provider and reset/notification workflow.
- Real catalogue, inventory, slot capacities, shop hours, holidays, tax, cancellation/refund policy, and delivery operations.

No credentials, real address, live prices, or shop policies are recorded in this file.

## Known Gaps and Follow-Up Work

- Production reservation expiry should move from an in-process timer to a reliable scheduler/queue if the API can sleep or run multiple instances.
- Payment refund workflow, coupons, complete delivery assignment/tracking operations, upload storage, and full admin management UI are not complete.
- Password reset APIs exist, but the full React reset-password screen and production email delivery remain to be completed.
- Production deployment has not been performed. The Vercel multi-service proposal needs explicit confirmation of service names, public routes, and hosting topology before adding `vercel.json`.
- Vercel’s API service must expose `/api/*` publicly for browser calls if hosted there. The existing backend routes include `/api/v1`, so rewrites must preserve that path prefix.

## Hosting Decision Record

The recommended straightforward production path is:

1. Build/deploy the Vite frontend to Vercel.
2. Deploy Express as a persistent Node service (for example Render or Railway).
3. Use MongoDB Atlas for persistent replica-set storage.
4. Use sibling custom domains (for example `bakeberry.example` and `api.bakeberry.example`) so the HttpOnly refresh cookie can be configured appropriately.

A Vercel multi-service deployment was researched but not applied. Before implementing it, confirm:

- Service names, such as `app` and `bakeberry-backend`.
- Which paths are public (recommended `/api/*` to the API, catch-all to the app).
- Whether the API should be hosted as a Vercel service or on a persistent Node host.
- Bindings: none for the current browser-to-API topology; specify them only if a backend function calls another service server-side.

## Model Context Protocol (MCP) Server Integration (2026-11-03)

An official MCP Server (`bakeberry-mcp-server`) was created and connected to Claude Desktop:
- **Package:** `bakeberry-mcp-server/` in TypeScript with `@modelcontextprotocol/sdk` and `zod`.
- **Transport:** Standard I/O (`stdio`).
- **Tools Implemented:**
  1. `get_available_cakes`: Retrieves active cakes, variants, descriptions, pricing, and live stock.
  2. `check_booking_availability`: Validates date/slot booking availability, enforcing the 3-calendar-day advance notice rule and `Asia/Kolkata` timezone.
  3. `get_order_status`: Retrieves order timeline, items, and scheduled slot with customer data ownership checks.
  4. `get_inventory_summary`: Displays staff/admin inventory summary of ready vs. reserved stock and daily production capacities.
- **Claude Desktop Configuration:** Linked via `%APPDATA%\Claude\claude_desktop_config.json`.
- **Documentation:** Architecture, tool reference, AI context management, and challenge records added under `docs/`.

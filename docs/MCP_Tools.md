# BAKEBERRY MCP Tools Reference

## Summary of Registered Tools

| Tool Name | Purpose | Access Level | API Endpoint Mapped |
| :--- | :--- | :--- | :--- |
| `get_available_cakes` | Retrieve active cakes, variants, prices, flavors, and ready stock. | Public | `GET /api/v1/cakes` |
| `check_booking_availability` | Check date/slot availability adhering to the 3-day lead time rule. | Public | `GET /api/v1/availability` / `POST /api/v1/bookings/validate` |
| `get_order_status` | Retrieve order status, fulfillment schedule, and item breakdown. | Customer Auth | `GET /api/v1/orders/:id` |
| `get_inventory_summary` | Detailed bakery stock levels, reservations, and production limits. | Admin/Staff Auth | `GET /api/v1/admin/inventory` |

---

## 1. `get_available_cakes`

### Input Schema
```json
{
  "type": "object",
  "properties": {
    "category": {
      "type": "string",
      "description": "Optional category filter (e.g. 'chocolate', 'fruit', 'celebration')"
    },
    "search": {
      "type": "string",
      "description": "Optional keyword search for cake name or description"
    },
    "page": { "type": "number", "description": "Page number (default 1)" },
    "limit": { "type": "number", "description": "Items per page (default 12, max 50)" }
  }
}
```

### Example Call
```json
{
  "name": "get_available_cakes",
  "arguments": { "category": "Fruit", "limit": 2 }
}
```

### Example Response
```markdown
Found 3 cake(s) in catalog (showing page 1):

🎂 **Strawberry Cloud** (Category: Fruit)
   *DEMO DATA — Vanilla sponge · fresh strawberry · soft cream*
   Variants:
   - **0.5 kg**: ₹850 | Stock: 5 ready | Immediate Delivery/Pickup available
     Flavors: Vanilla, Strawberry
   - **1 kg**: ₹1450 | Stock: 6 ready | Immediate Delivery/Pickup available
     Flavors: Vanilla, Strawberry

🎂 **Lemon & Olive Oil** (Category: Fruit)
   *DEMO DATA — Bright lemon · olive oil · vanilla glaze*
   Variants:
   - **0.5 kg**: ₹980 | Stock: 3 ready | Immediate Delivery/Pickup available
     Flavors: Lemon
```

---

## 2. `check_booking_availability`

### Input Schema
```json
{
  "type": "object",
  "properties": {
    "date": {
      "type": "string",
      "description": "Target booking date in YYYY-MM-DD format"
    },
    "endDate": {
      "type": "string",
      "description": "Optional end date in YYYY-MM-DD format for range queries"
    },
    "cakeId": { "type": "string", "description": "Optional MongoDB ID of the cake" },
    "variantId": { "type": "string", "description": "Optional MongoDB ID of the cake variant" },
    "slot": { "type": "string", "description": "Optional slot name (e.g. '10:00-12:00')" }
  },
  "required": ["date"]
}
```

### Example Call
```json
{
  "name": "check_booking_availability",
  "arguments": { "date": "2026-11-08", "endDate": "2026-11-09" }
}
```

### Example Response
```markdown
📅 **Booking Availability from 2026-11-08 to 2026-11-09** (Asia/Kolkata timezone)
⚠️ *Notice: BAKEBERRY requires a minimum advance booking lead time. Earliest eligible date is 2026-11-06.*

**Date: 2026-11-08**
  - Slot `10:00-12:00`: ✅ Available (8 slots remaining)
  - Slot `14:00-16:00`: ✅ Available (8 slots remaining)
  - Slot `16:00-18:00`: ✅ Available (8 slots remaining)

**Date: 2026-11-09**
  - Slot `10:00-12:00`: ✅ Available (8 slots remaining)
  - Slot `14:00-16:00`: ✅ Available (8 slots remaining)
  - Slot `16:00-18:00`: ✅ Available (8 slots remaining)
```

---

## 3. `get_order_status`

### Input Schema
```json
{
  "type": "object",
  "properties": {
    "orderId": { "type": "string", "description": "The 24-character hexadecimal MongoDB Order ID" },
    "authToken": { "type": "string", "description": "Optional customer JWT Bearer token" }
  },
  "required": ["orderId"]
}
```

### Privacy & Security
If no auth token is provided (in arguments or via `BAKEBERRY_CUSTOMER_TOKEN`), the tool responds with:
> `Authentication required: To protect customer privacy and order ownership, please provide a customer JWT auth token or configure BAKEBERRY_CUSTOMER_TOKEN in the environment.`

---

## 4. `get_inventory_summary`

### Input Schema
```json
{
  "type": "object",
  "properties": {
    "adminToken": { "type": "string", "description": "Optional Admin/Staff JWT Bearer token" }
  }
}
```

### Privacy & Security
If no admin/staff token is provided (in arguments or via `BAKEBERRY_ADMIN_TOKEN`), the tool responds with:
> `Admin authorization required: Viewing inventory requires staff or admin credentials. Please provide an admin/staff JWT token or configure BAKEBERRY_ADMIN_TOKEN in the environment.`


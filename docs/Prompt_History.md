# MCP Prompt & Interaction History

## Example Prompts & Expected Tool Execution

### 1. Browse Cake Catalog
- **User Prompt:** "What cakes do you have available right now?"
- **AI Tool Selected:** `get_available_cakes`
- **Arguments:** `{}`
- **Response Flow:** The MCP server contacts `GET /api/v1/cakes`, retrieves the active cakes (e.g., *Strawberry Cloud*, *Dark Side of Cocoa*, *Lemon & Olive Oil*), formats them with ready stock counts and variant prices, and returns the markdown block to Claude.

---

### 2. Check Advance Booking Availability
- **User Prompt:** "Can I book a cake for November 8th?"
- **AI Tool Selected:** `check_booking_availability`
- **Arguments:** `{"date": "2026-11-08"}`
- **Response Flow:** The MCP server checks if November 8 satisfies the 3-day lead time rule (`Asia/Kolkata` timezone), queries `GET /api/v1/availability?from=2026-11-08&to=2026-11-08`, and confirms the available delivery/pickup slots.

---

### 3. Check Order Status
- **User Prompt:** "What is the status of order 507f1f77bcf86cd799439011?"
- **AI Tool Selected:** `get_order_status`
- **Arguments:** `{"orderId": "507f1f77bcf86cd799439011"}`
- **Response Flow:** The tool requests authentication if not pre-configured, or sends the Bearer token to `GET /api/v1/orders/:id`, returning current progress (e.g. `preparing`, `out_for_delivery`).

---

### 4. Admin Inventory Summary
- **User Prompt:** "Show today's inventory breakdown for the bakery."
- **AI Tool Selected:** `get_inventory_summary`
- **Arguments:** `{}`
- **Response Flow:** Checks admin authorization and contacts `GET /api/v1/admin/inventory`, reporting live stock vs. reserved quantities and production capacity per day.


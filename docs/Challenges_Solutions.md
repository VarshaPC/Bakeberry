# MCP Implementation — Challenges and Solutions

| # | Challenge | Root Cause | Solution Implemented |
|---|---|---|---|
| 1 | **stdio Corruption by Console Logs** | In MCP stdio transport, writing arbitrary text to `stdout` breaks the JSON-RPC framing expected by Claude Desktop. | All operational and startup logging is routed strictly to `console.error` (stderr), leaving `stdout` dedicated to valid JSON-RPC frames. |
| 2 | **Advance Booking Calculation** | BAKEBERRY enforces a strict 3-calendar-day advance notice rule in `Asia/Kolkata` time. | Implemented `getEarliestBookingDate()` in `bookings.ts` using `Intl.DateTimeFormat` with `Asia/Kolkata` to calculate the earliest eligible booking date and notify the AI agent when dates violate the rule. |
| 3 | **Customer Privacy Protection** | Exposing raw order queries via an LLM could allow unauthorized access to customer orders. | `get_order_status` requires customer authentication (either passed dynamically or via environment variable) and delegates authorization validation to the backend JWT middleware. |
| 4 | **Backend Unavailability Handling** | If Claude attempts a tool call while the backend server is temporarily stopped, Axios throws an `ECONNREFUSED` exception. | The API client intercepts connection errors and formats them into a clear, actionable message advising the user/agent that the Express backend needs to be started at `http://127.0.0.1:4000/api/v1`. |
| 5 | **Module Format Compatibility** | The backend uses ES Modules (`"type": "module"`), while TypeScript compiles to various targets. | Configured TypeScript `tsconfig.json` with `module: "NodeNext"` and `moduleResolution: "NodeNext"` with explicit `.js` extension imports in TypeScript source files. |


# BAKEBERRY MCP Server Documentation

This is the operational and developer guide for the BAKEBERRY Model Context Protocol (MCP) server in `bakeberry-mcp-server/`. It describes the implementation in this repository; the [MCP tools reference](./MCP_Tools.md) and [MCP architecture](./MCP_Architecture.md) provide additional detail.

## 1. What the server does

The server exposes selected BAKEBERRY bakery information and operations as MCP tools for an AI host. It translates MCP tool calls into HTTP requests to the BAKEBERRY REST API and formats the API response as text for the host.

It currently exposes four tools:

| Tool | Purpose | Authentication |
|---|---|---|
| `get_available_cakes` | Browse active cakes and variants, including prices and available stock | None |
| `check_booking_availability` | Query one date or a date range, or validate one cake/variant/slot combination | None |
| `get_order_status` | Read order and fulfillment details | Customer JWT |
| `get_inventory_summary` | Read inventory and production capacity | Admin or staff JWT |

This server does **not** create orders, reserve inventory, accept payments, or change bookings. A successful availability check or validation is informational; it does not reserve a slot.

## 2. Architecture and request flow

```text
MCP host (e.g. Claude Desktop or VS Code)
    │
    │ MCP over stdio (JSON-RPC)
    ▼
bakeberry-mcp-server (Node.js + TypeScript)
    │
    │ HTTP requests to BAKEBERRY_API_URL
    ▼
BAKEBERRY REST API (/api/v1)
    │
    ▼
Configured BAKEBERRY database
```

- The MCP transport is `stdio`; the server does not listen on an HTTP port.
- MCP tool discovery and invocation are handled in `bakeberry-mcp-server/src/index.ts`.
- Tool implementations live in `bakeberry-mcp-server/src/tools/`.
- The shared HTTP client is `bakeberry-mcp-server/src/services/api-client.ts`. Requests have a 10-second timeout.
- API errors and connection failures are returned as tool errors. Startup and diagnostic messages go to `stderr` so they do not corrupt stdio protocol output.
- Only the `tools` MCP capability is registered. There are no MCP resources or prompts registered by this implementation.

## 3. Requirements

- Node.js 20 or later
- npm
- The BAKEBERRY backend API running and reachable by the MCP process
- Credentials with the appropriate role if using the order or inventory tools
- An MCP-compatible host configured to launch a stdio server

The MCP server package is an ES module and is compiled from TypeScript with `tsc`.

## 4. Install, configure, and run

Run commands from the MCP server directory:

```powershell
cd bakeberry-mcp-server
npm install
Copy-Item .env.example .env
npm run build
npm start
```

`npm start` starts the compiled `dist/index.js`. For local development without compiling first, use:

```powershell
npm run dev
```

The process is intended to be launched and managed by an MCP host. Starting it in a terminal is useful as a basic startup check, but an MCP host must connect to its standard input/output to make tool calls.

### Start the backend

The MCP server requires the backend API for all four tools. From the repository root, start the backend in a separate terminal:

```powershell
cd bakeberry-backend
npm install
npm run dev
```

For local demo data, use the backend's demo command when appropriate:

```powershell
npm run dev:demo
```

The backend's base URL defaults to `http://127.0.0.1:4000/api/v1`. Verify it is reachable with:

```powershell
Invoke-RestMethod http://127.0.0.1:4000/api/v1/health
```

The response should include `"status": "ok"`. Backend setup, database configuration, and demo-data behavior are documented in the backend project.

## 5. Configuration

The MCP server loads environment variables through `dotenv` and then applies these defaults:

| Variable | Default | Description |
|---|---|---|
| `BAKEBERRY_API_URL` | `http://127.0.0.1:4000/api/v1` | Backend API base URL, including `/api/v1` |
| `SHOP_TIMEZONE` | `Asia/Kolkata` | Time zone used when calculating the earliest eligible booking date |
| `SHOP_MIN_BOOKING_DAYS` | `3` | Minimum calendar-day advance notice used by the server's booking validation and warning |
| `BAKEBERRY_CUSTOMER_TOKEN` | unset | Optional customer JWT used when `get_order_status` receives no `authToken` |
| `BAKEBERRY_ADMIN_TOKEN` | unset | Optional admin/staff JWT used when `get_inventory_summary` receives no `adminToken` |

The `.env` file is useful for local development. `dotenv` looks for it in the server process's current working directory, so an MCP host may not load the project `.env` automatically. In an MCP host configuration, set these values in the server entry's `env` object instead. Host-provided environment variables take precedence over `.env` values.

Do not commit real JWTs or other secrets. Keep credentials out of screenshots, logs, source control, and prompts. Prefer short-lived, least-privilege tokens and rotate them if exposed. Prefer environment configuration over passing a token in a tool argument, since arguments may be visible in host conversation history or logs. If no token is configured, the protected tool returns an explicit authentication-required error.

## 6. MCP host configuration

Use the absolute path to the built JavaScript entry point. Build the project first so that `dist/index.js` exists.

### Claude Desktop on Windows

Add a server entry to `%APPDATA%\Claude\claude_desktop_config.json`. Replace the example project path with the actual location on your machine; JSON backslashes must be escaped.

```json
{
  "mcpServers": {
    "bakeberry": {
      "command": "node",
      "args": [
        "D:\\Texol New\\AI project\\bakeberry-mcp-server\\dist\\index.js"
      ],
      "env": {
        "BAKEBERRY_API_URL": "http://127.0.0.1:4000/api/v1"
      }
    }
  }
}
```

Add `BAKEBERRY_CUSTOMER_TOKEN` and/or `BAKEBERRY_ADMIN_TOKEN` to `env` only if the corresponding protected tools are needed. Restart Claude Desktop after editing the configuration.

### VS Code

For VS Code versions that support MCP configuration, create or update `.vscode/mcp.json` in the workspace:

```json
{
  "servers": {
    "bakeberry": {
      "type": "stdio",
      "command": "node",
      "args": [
        "D:\\Texol New\\AI project\\bakeberry-mcp-server\\dist\\index.js"
      ],
      "env": {
        "BAKEBERRY_API_URL": "http://127.0.0.1:4000/api/v1"
      }
    }
  }
}
```

Replace the path with the local absolute path. Use the MCP controls in VS Code to start the server and approve its tools, following the host's trust and approval prompts.

### Other stdio MCP clients

Configure the host to launch `node` with the absolute path to `bakeberry-mcp-server/dist/index.js`, and pass the required settings as environment variables. The host must preserve the process's standard input and output for MCP communication.

## 7. Tool reference

Tool schemas are exposed to the host through MCP's `tools/list` request. The server returns readable text for each successful call and an `isError` result for failures.

### `get_available_cakes`

Browse the active catalog. Maps to `GET /cakes`.

| Argument | Type | Required | Behavior |
|---|---|---:|---|
| `category` | string | No | Filters by category |
| `search` | string | No | Searches cake name/description |
| `page` | number | No | Page number; defaults to `1` |
| `limit` | number | No | Page size; defaults to `12`; backend caps it at `50` |

The result includes active cake variants and formatted price, flavors, and ready stock (`max(0, stock - reserved)`). If no matching cakes are returned, the tool says so. For example:

```json
{
  "name": "get_available_cakes",
  "arguments": {
    "category": "Fruit",
    "limit": 5
  }
}
```

### `check_booking_availability`

Query booking slots or validate a specific booking choice. General availability maps to `GET /availability`; specific validation maps to `POST /bookings/validate`.

| Argument | Type | Required | Behavior |
|---|---|---:|---|
| `date` | string | Yes | Start/target date in `YYYY-MM-DD` form |
| `endDate` | string | No | End date for a range; defaults to `date` |
| `cakeId` | string | No | Cake MongoDB ID for a specific validation |
| `variantId` | string | No | Variant MongoDB ID for a specific validation |
| `slot` | string | No | Slot name for a specific validation |

To validate a particular cake size and slot, provide **all three** of `cakeId`, `variantId`, and `slot`. If any is omitted, the tool makes a general date/range availability query instead. Specific validation also requires the variant to be eligible for advance booking, and checks preparation lead time, the minimum notice, and remaining slot capacity.

The tool checks the date string's format and rejects an `endDate` earlier than `date`. The backend performs further validation. The lead-time warning is not a reservation and does not guarantee availability at a later checkout.

Example range query:

```json
{
  "name": "check_booking_availability",
  "arguments": {
    "date": "2026-11-10",
    "endDate": "2026-11-12"
  }
}
```

Example specific validation:

```json
{
  "name": "check_booking_availability",
  "arguments": {
    "date": "2026-11-10",
    "cakeId": "64f000000000000000000001",
    "variantId": "64f000000000000000000002",
    "slot": "10:00 - 13:00"
  }
}
```

The example IDs are placeholders; use IDs returned by the backend catalog.

### `get_order_status`

Retrieve an order's status, payment state, items, schedule, and—when applicable—delivery address and status history. Maps to `GET /orders/:id`.

| Argument | Type | Required | Behavior |
|---|---|---:|---|
| `orderId` | string | Yes | 24-character hexadecimal MongoDB ObjectId |
| `authToken` | string | No | Customer JWT; falls back to `BAKEBERRY_CUSTOMER_TOKEN` |

The server checks the ObjectId format and requires a token before making the request. The backend performs authentication and order access checks. Treat the response as private customer data.

```json
{
  "name": "get_order_status",
  "arguments": {
    "orderId": "64f000000000000000000003"
  }
}
```

### `get_inventory_summary`

Retrieve stock, reserved and available quantities, status, and daily production capacity. Maps to `GET /admin/inventory`.

| Argument | Type | Required | Behavior |
|---|---|---:|---|
| `adminToken` | string | No | Admin/staff JWT; falls back to `BAKEBERRY_ADMIN_TOKEN` |

The backend requires an authenticated `admin` or `staff` role. Treat inventory and operational details as non-public.

```json
{
  "name": "get_inventory_summary",
  "arguments": {}
}
```

## 8. Backend API mapping and access control

| MCP tool | Backend request | Access enforced by |
|---|---|---|
| `get_available_cakes` | `GET /api/v1/cakes` | Public catalog route |
| `check_booking_availability` | `GET /api/v1/availability` or `POST /api/v1/bookings/validate` | Public route and backend booking rules |
| `get_order_status` | `GET /api/v1/orders/:id` | Backend authentication and order access rules |
| `get_inventory_summary` | `GET /api/v1/admin/inventory` | Backend authentication and `admin`/`staff` role check |

The MCP server passes protected-tool tokens as bearer credentials to the API. MCP-side checks for missing tokens and order ID format are convenience/early validation; they do not replace backend authorization. Keep the API reachable only by trusted clients and use the backend's own authentication and deployment controls.

## 9. Errors and troubleshooting

Tool failures are returned with `isError: true` and a text explanation. Common cases:

| Symptom | Likely cause and action |
|---|---|
| “Unable to connect to BAKEBERRY API server” | Start the backend and verify `BAKEBERRY_API_URL`, port, and network reachability. |
| Authentication-required message for order/inventory | Supply the matching tool token or configure the corresponding token environment variable. |
| HTTP 401/403 | Token is missing, invalid, expired, or lacks the required role; obtain a valid customer or staff/admin token. |
| Invalid order ID | Pass the backend order's 24-character hexadecimal ID. |
| Booking validation error | Check date, IDs, slot, advance-notice/preparation rules, and current remaining capacity. |
| MCP host shows no tools | Confirm the absolute `dist/index.js` path, rebuild with `npm run build`, restart/reload the host, and inspect its MCP logs. |
| JSON-RPC/protocol output appears malformed | Do not add `console.log` or other stdout output to server code; write diagnostics to `stderr`. |

The API client has a 10-second request timeout. Backend error codes/messages are surfaced where available.

## 10. Development and maintenance

### Commands

```powershell
cd bakeberry-mcp-server
npm install
npm run build
npm start
npm run dev
```

There is no test script defined in this package currently. The TypeScript build is the available package-level validation:

```powershell
npm run build
```

### Source layout

```text
bakeberry-mcp-server/
├── src/
│   ├── index.ts                 # MCP server, tool registry, stdio transport
│   ├── config.ts                # Environment configuration
│   ├── services/api-client.ts   # Backend HTTP client and error handling
│   ├── tools/
│   │   ├── cakes.ts
│   │   ├── bookings.ts
│   │   ├── orders.ts
│   │   └── inventory.ts
│   └── utils/formatters.ts      # Human-readable tool results
├── .env.example
├── package.json
└── tsconfig.json
```

To add a tool, implement it under `src/tools/`, add it to the registry in `src/index.ts`, document its input and behavior here and in [MCP_Tools.md](./MCP_Tools.md), then run `npm run build`.

## 11. Known scope and behavior notes

- The server is a local stdio process, not a remotely hosted MCP HTTP/SSE service.
- The tool handlers return formatted text rather than structured content blocks.
- Booking availability is a point-in-time query; booking validation does not create a reservation.
- The MCP package currently has no dedicated automated test script.
- `SHOP_TIMEZONE` and `SHOP_MIN_BOOKING_DAYS` configure the server's earliest-date calculation and warning. The backend independently enforces its configured booking rules; keep the two configurations aligned.

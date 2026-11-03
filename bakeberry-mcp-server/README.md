# BAKEBERRY MCP Server

A Model Context Protocol (MCP) server that connects AI assistants like **Claude Desktop** to the **BAKEBERRY** cake ordering and booking platform.

## Features

- **Protocol**: Model Context Protocol (MCP) using stdio transport.
- **Language**: TypeScript (Node.js >= 20).
- **Backend Integration**: Communicates directly with the BAKEBERRY Express REST API (`/api/v1`).
- **Business Rules Preserved**: Respects the 3-calendar-day advance notice requirement (`Asia/Kolkata` timezone), real-time stock deductions, and capacity limits.

## Available MCP Tools

| Tool Name | Description | Required Role / Auth |
| :--- | :--- | :--- |
| `get_available_cakes` | Browse active cakes, variants, descriptions, prices, flavors, and stock. | Public |
| `check_booking_availability` | Check date/slot availability adhering to the 3-day lead time. | Public |
| `get_order_status` | Retrieve order status, fulfillment schedule, and item breakdown. | Customer Auth |
| `get_inventory_summary` | Summary of stock levels, reserved items, and daily production capacity. | Admin / Staff Auth |

## Setup & Building

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Copy `.env.example` to `.env` and verify `BAKEBERRY_API_URL` (default: `http://127.0.0.1:4000/api/v1`).

3. **Build the server:**
   ```bash
   npm run build
   ```

## Claude Desktop Configuration

Add the server to Claude Desktop's config file at:
`%APPDATA%\Claude\claude_desktop_config.json`

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

Restart Claude Desktop to load the tools.


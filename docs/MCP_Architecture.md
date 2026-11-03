# BAKEBERRY MCP Architecture

## 1. Overview

The BAKEBERRY Model Context Protocol (MCP) server provides an open-standard bridge between AI hosts (like Claude Desktop) and the BAKEBERRY cake ordering and advance booking system.

```
+-------------------------------------------------------+
|                    Claude Desktop                     |
|                      (MCP Host)                       |
+---------------------------+---------------------------+
                            |
                            | stdio (JSON-RPC 2.0)
                            v
+-------------------------------------------------------+
|                 BAKEBERRY MCP Server                  |
|                 Node.js + TypeScript                  |
|                                                       |
|  - MCP Tool Registry       - StdioServerTransport     |
|  - JSON Schema Validation  - Safe Output Formatting   |
|  - Error Handlers          - REST API Client          |
+---------------------------+---------------------------+
                            |
                            | HTTP / REST (127.0.0.1:4000)
                            v
+-------------------------------------------------------+
|                BAKEBERRY Express Backend              |
|                 Endpoints (/api/v1)                   |
|                                                       |
|  - GET /cakes              - GET /availability        |
|  - POST /bookings/validate - GET /orders/:id          |
|  - GET /admin/inventory                               |
+---------------------------+---------------------------+
                            |
                            | Mongoose ODM
                            v
+-------------------------------------------------------+
|                   MongoDB Database                    |
+-------------------------------------------------------+
```

## 2. Key Architectural Guarantees

1. **Protocol Compliance**: Implements the official `@modelcontextprotocol/sdk` (protocol version `2024-11-05`) over standard input/output (`stdio`).
2. **Diagnostic Cleanliness**: No debugging statements write to `stdout`; all operational logs output to `stderr` to maintain clean JSON-RPC frame integrity.
3. **Business Logic Preservation**:
   - Timezone: Preserves `Asia/Kolkata` for all date calculations and store operating hours.
   - Advance Booking Lead Time: Preserves the required minimum 3-calendar-day advance notice rule.
   - Stock Protection: Respects real-time inventory and reserved slot quantities.
4. **Security & Privacy**:
   - Order lookup requires authentication and protects individual customer details.
   - Inventory summaries require administrative or staff authorization.
   - Database credentials, JWT secrets, and payment keys are never exposed over MCP.


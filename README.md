# BAKEBERRY

A single-shop artisanal cake ordering, advance booking, and MCP-integrated bakery platform.

## Architecture & Components

- **Frontend (`/`)**: React + Vite single-page application with cake discovery, cart, booking calendar, and order tracking.
- **Backend (`cakeora-backend/`)**: Node.js, Express, and MongoDB REST API (`/api/v1`) with JWT auth, transaction-safe stock reservations, and Razorpay payment integration.
- **MCP Server (`bakeberry-mcp-server/`)**: Model Context Protocol server exposing BAKEBERRY tools to Claude Desktop over stdio.

## Documentation Index

All detailed technical documentation is organized in the [`docs/`](./docs) directory:

- [**MCP Architecture**](./docs/MCP_Architecture.md) — Protocol specifications, system boundaries, and request flow.
- [**MCP Tools Reference**](./docs/MCP_Tools.md) — Full schemas, inputs, and example responses for all 4 MCP tools.
- [**Full Implementation Plan**](./docs/BAKEBERRY_MCP_Full_Implementation_Plan%20(1).md) — Detailed phase-by-phase implementation plan.
- [**Project Documentation**](./docs/BAKEBERRY_PROJECT_DOCUMENTATION.md) — Complete BAKEBERRY storefront and backend specifications.
- [**Project Log**](./docs/PROJECT_LOG.md) — Comprehensive development timeline and architecture decision records.
- [**AI Context Management**](./docs/AI_Context_Management.md) — Context boundaries, token optimization, and security practices.
- [**Challenges & Solutions**](./docs/Challenges_Solutions.md) — Encountered obstacles and their resolutions.
- [**Prompt History**](./docs/Prompt_History.md) — Example natural language prompts and corresponding tool execution paths.
- [**Project Overview Presentation**](./docs/BAKEBERRY_Project_Overview.pptx) — Slide deck detailing project features.
- [**Project Presentation**](./docs/BAKEBERRY_Project_Presentation.pptx) — Project presentation slide deck.

## Quick Start

### 1. Start the Backend API
```bash
cd cakeora-backend
npm run dev
# Starts on http://127.0.0.1:4000/api/v1 with demo data
```

### 2. Start the Frontend
```bash
npm run dev
# Starts Vite dev server on http://127.0.0.1:5500
```

### 3. Build & Run the MCP Server
```bash
cd bakeberry-mcp-server
npm install
npm run build
npm start
```

### 4. Claude Desktop Integration
Add the server entry to `%APPDATA%\Claude\claude_desktop_config.json`:
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


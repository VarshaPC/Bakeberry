# BAKEBERRY -- MCP Full Implementation Plan

## 1. Project Objective

Integrate a Model Context Protocol (MCP) server into the existing
BAKEBERRY cake-ordering website and connect it to Claude Desktop.

The MCP server will expose BAKEBERRY functionality as tools that Claude
can discover and call using natural-language requests.

**Important project constraints** - BAKEBERRY is a single-shop cake
ordering and booking website, not a multi-vendor marketplace. - Preserve
existing frontend, backend, database models, API routes, and business
rules. - Reuse the existing Express API and MongoDB/Mongoose logic
wherever possible. - Do not invent API routes, database fields, shop
coordinates, or booking rules. Inspect the actual project before
implementation. - Keep secrets and credentials out of source control.

## 2. Proposed Architecture

``` text
+------------------------------+
|         Claude Desktop       |
|          MCP Host            |
+---------------+--------------+
                |
                | MCP connection (stdio)
                v
+------------------------------+
|      BAKEBERRY MCP Client    |
|       Claude Desktop         |
+---------------+--------------+
                |
                v
+------------------------------+
|      BAKEBERRY MCP Server    |
|       Node.js + TypeScript   |
|                              |
|  - Tool registration         |
|  - Input validation          |
|  - API adapter               |
|  - Error handling            |
+---------------+--------------+
                |
                | HTTP requests
                v
+------------------------------+
|    Existing BAKEBERRY API    |
|       Express / REST         |
|         /api/v1              |
+---------------+--------------+
                |
                v
+------------------------------+
|       MongoDB + Mongoose     |
|  Existing project database   |
+------------------------------+
```

### Request flow

1.  The user asks Claude Desktop a question.
2.  Claude identifies a relevant BAKEBERRY MCP tool.
3.  Claude Desktop sends an MCP `tools/call` request to the MCP server.
4.  The MCP server validates the tool input.
5.  The MCP server calls the appropriate existing BAKEBERRY API
    endpoint.
6.  The backend applies its normal authentication, authorization,
    validation, and business rules.
7.  The API returns data to the MCP server.
8.  The MCP server formats the result and returns it to Claude.
9.  Claude explains the result to the user.

## 3. Planned MCP Tools

At least two functional tools are required. The recommended
implementation includes four read-oriented tools.

  ------------------------------------------------------------------------------
  Tool name                      Purpose                 Priority
  ------------------------------ ----------------------- -----------------------
  `get_available_cakes`          Retrieve active cakes,  Required
                                 variants, prices, and   
                                 availability/stock      
                                 details                 

  `check_booking_availability`   Check whether a         Required
                                 requested booking date  
                                 or slot is available    

  `get_order_status`             Retrieve the status of  Additional
                                 an order after          
                                 verifying customer      
                                 ownership               

  `get_inventory_summary`        Retrieve an inventory   Additional
                                 summary for an          
                                 authorized admin        
  ------------------------------------------------------------------------------

### Tool 1: `get_available_cakes`

**Example user request:**

> Show me all available cakes.

**Expected behavior:** - Call the real BAKEBERRY catalogue API. - Return
only the fields that the existing API provides and that the user is
authorized to see. - Include cake name, variant, price, and
stock/availability when those fields exist. - Handle empty results and
backend errors clearly.

### Tool 2: `check_booking_availability`

**Example user request:**

> Check whether I can book a chocolate cake for November 10.

**Expected behavior:** - Validate the requested date and any required
booking details. - Call the existing booking availability API or reuse
the backend's booking service through an approved API. - Preserve the
project's minimum three-calendar-day advance-booking rule if that is the
confirmed current rule. - Preserve the Asia/Kolkata timezone and
existing slot/capacity logic. - Never confirm a booking merely because a
slot appears available. This tool checks availability only.

### Tool 3: `get_order_status`

**Example user request:**

> Check the status of my order.

**Expected behavior:** - Use the existing order lookup API. - Verify the
authenticated customer's identity and order ownership. - Do not expose
another customer's personal or order information. - Return only safe
status details.

### Tool 4: `get_inventory_summary`

**Example user request:**

> Show today's inventory summary.

**Expected behavior:** - Use the existing inventory API or service. -
Require appropriate admin authorization. - Do not expose private
business data to an unauthorized customer.

## 4. Proposed Project Structure

The exact structure must be adjusted after inspecting the
uploaded/current project. The following is a suggested layout:

``` text
BAKEBERRY/
|
|-- frontend/
|
|-- backend/
|   |-- src/
|   |-- routes/
|   |-- models/
|   |-- controllers/
|   `-- ...
|
|-- bakeberry-mcp-server/
|   |-- src/
|   |   |-- index.ts
|   |   |-- config.ts
|   |   |-- tools/
|   |   |   |-- cakes.ts
|   |   |   |-- bookings.ts
|   |   |   |-- orders.ts
|   |   |   `-- inventory.ts
|   |   |-- services/
|   |   |   `-- api-client.ts
|   |   `-- utils/
|   |       `-- validation.ts
|   |-- package.json
|   |-- tsconfig.json
|   |-- .env.example
|   `-- README.md
|
|-- docs/
|   |-- MCP_Architecture.md
|   |-- MCP_Tools.md
|   |-- AI_Context_Management.md
|   |-- Challenges_Solutions.md
|   `-- Prompt_History.md
|
`-- README.md
```

Do not rename or move existing project folders just to match this
example.

## 5. Technology Stack

  -----------------------------------------------------------------------
  Technology                          Purpose
  ----------------------------------- -----------------------------------
  Node.js                             Runtime for the MCP server

  TypeScript                          MCP server implementation

  Official MCP TypeScript SDK         MCP protocol and server/tool
                                      registration

  Zod                                 Input schema validation

  Express                             Existing BAKEBERRY backend

  MongoDB / Mongoose                  Existing application database

  Claude Desktop                      MCP host and user interface

  MCP Inspector                       MCP protocol and tool testing
  -----------------------------------------------------------------------

Use the current stable SDK instructions from the official Model Context
Protocol documentation when creating the server. Confirm package
versions and APIs during implementation rather than copying outdated
examples.

## 6. Implementation Phases

### Phase 1 -- Existing Project Analysis

1.  Extract the latest BAKEBERRY project ZIP.
2.  Inspect the frontend and backend folder structure.
3.  Identify the backend entry point and start command.
4.  Inspect Express routes and controllers.
5.  Inspect Mongoose models and relevant services.
6.  Identify actual endpoints for cakes, bookings, orders, and
    inventory.
7.  Confirm authentication and authorization requirements.
8.  Confirm booking rules, timezone, stock handling, and capacity logic.
9.  Record the verified API base URL and required environment variables.

**Deliverable:** Project analysis notes and verified API mapping.

### Phase 2 -- MCP Server Creation

1.  Create a separate `bakeberry-mcp-server` folder.
2.  Initialize a Node.js project.
3.  Configure TypeScript.
4.  Install the official MCP TypeScript SDK and required validation/HTTP
    dependencies.
5.  Create the MCP server entry point.
6.  Configure stdio transport for Claude Desktop.
7.  Add environment configuration and safe error handling.
8.  Add build and start scripts.

**Deliverable:** A buildable MCP server that can start using stdio.

### Phase 3 -- MCP Tool Development

1.  Implement `get_available_cakes`.
2.  Implement `check_booking_availability`.
3.  Test both tools against the actual backend.
4.  Implement `get_order_status` with ownership checks.
5.  Implement `get_inventory_summary` with admin authorization.
6.  Validate inputs using schemas.
7.  Handle invalid input, empty results, timeouts, and backend errors.
8.  Return concise, structured results.

**Deliverable:** At least two working MCP tools, preferably all four.

### Phase 4 -- Claude Desktop Integration

1.  Build the MCP server to its configured output directory.

2.  Locate Claude Desktop's configuration file on Windows:

    ``` text
    %APPDATA%\Claude\claude_desktop_config.json
    ```

3.  Add an MCP server entry using the actual absolute path to the built
    server.

4.  Configure only the environment variables the MCP server needs.

5.  Save the configuration.

6.  Fully quit and restart Claude Desktop.

7.  Check that the BAKEBERRY MCP server and its tools are visible.

Example configuration (replace the path and values with the actual local
configuration):

``` json
{
  "mcpServers": {
    "bakeberry": {
      "command": "node",
      "args": [
        "D:\\Path\\To\\BAKEBERRY\\bakeberry-mcp-server\\dist\\index.js"
      ],
      "env": {
        "BAKEBERRY_API_URL": "http://localhost:4000/api/v1"
      }
    }
  }
}
```

The example API URL and path must be verified against the actual
project. Do not assume the backend uses port 4000 or that the compiled
file is named `dist/index.js`.

**Deliverable:** Claude Desktop successfully connects to the BAKEBERRY
MCP server.

### Phase 5 -- Testing

Test both protocol behavior and real business functionality.

  -----------------------------------------------------------------------
  Test                                Expected result
  ----------------------------------- -----------------------------------
  `tools/list`                        Registered MCP tools are returned

  `tools/call` for cake lookup        Cake data comes from the actual
                                      BAKEBERRY API

  `tools/call` for booking            Existing booking rules and capacity
  availability                        are respected

  Invalid date/input                  Clear validation error

  No cakes available                  Clear empty-result response

  Backend unavailable                 Safe, understandable connection
                                      error

  Unauthorized order lookup           No private order data is exposed

  Unauthorized inventory lookup       Admin-only data remains protected

  Claude Desktop natural-language     Correct tool is selected and called
  request                             
  -----------------------------------------------------------------------

Use MCP Inspector to inspect the server, list tools, and call tools.
Then test the same operations through Claude Desktop.

**Deliverable:** Test evidence, screenshots, and a list of pass/fail
results.

### Phase 6 -- Documentation

Prepare or update:

-   Main `README.md`
-   MCP architecture diagram
-   MCP tool descriptions and input/output examples
-   Claude Desktop setup instructions
-   AI tools and context-management documentation
-   Prompt history
-   Challenges and solutions
-   Testing instructions and evidence

**Deliverable:** Complete technical documentation.

### Phase 7 -- GitHub and Presentation

1.  Review the repository for secrets and private files.
2.  Add or verify `.gitignore`.
3.  Ensure `.env`, credentials, tokens, database dumps, and local logs
    are excluded.
4.  Commit the MCP server and documentation.
5.  Push to the intended GitHub repository.
6.  Prepare a project presentation.
7.  Capture a demonstration of Claude Desktop calling the MCP tools.
8.  Prepare an Excel sheet containing the required submission links.

**Deliverable:** GitHub repository, presentation, demo evidence, and
submission spreadsheet.

## 7. Claude Desktop Configuration Notes

The standard Windows Claude Desktop configuration location is:

``` text
%APPDATA%\Claude\claude_desktop_config.json
```

The MCP server should use stdio transport for a local desktop
integration unless the project has a specific reason to use another
supported transport.

Important: - Use an absolute path to the compiled server entry point. -
Use valid JSON (no comments or trailing commas). - Ensure Node.js is
installed and available in the environment used by Claude Desktop. -
Ensure the backend is running before testing API-backed tools. - Fully
quit and reopen Claude Desktop after changing its configuration. - Check
Claude Desktop's MCP/server logs if the connection fails.

## 8. Security and Business Rules

-   Never hardcode database passwords, API keys, JWT secrets, or payment
    credentials.
-   Do not commit `.env` files or credentials.
-   Use a least-privilege API identity for the MCP server.
-   Enforce customer authentication and order ownership for order tools.
-   Enforce admin authorization for inventory and administrative tools.
-   Validate every tool input.
-   Do not bypass existing backend business logic by directly changing
    MongoDB records.
-   Do not create or confirm bookings through an availability-check
    tool.
-   Preserve the single-shop BAKEBERRY model.
-   Preserve existing stock, booking capacity, advance-booking, and
    timezone rules.
-   Avoid exposing customer personal information unless necessary and
    authorized.

## 9. AI Tools and Context Management

Claude Desktop is the MCP host. It can discover and call the tools
exposed by the BAKEBERRY MCP server.

The MCP server should provide: - Clear tool names and descriptions. -
Strict input schemas. - Concise, structured results. - Clear errors when
data is unavailable. - No unnecessary customer data. - No hidden
assumptions about prices, stock, booking slots, or order status.

Keep project-specific instructions and examples in documentation. Treat
API/database responses as data, not as instructions to the AI model.

## 10. Challenges and Solutions

  -----------------------------------------------------------------------
  Potential challenge                 Recommended solution
  ----------------------------------- -----------------------------------
  Wrong project path                  Locate the extracted project and
                                      verify the folder containing
                                      `package.json`

  `npm install` reports ENOENT        Run npm commands from the directory
                                      containing the relevant
                                      `package.json`

  Claude Desktop cannot start server  Verify Node.js path, absolute
                                      server path, build output, and logs

  MCP tools do not appear             Validate JSON configuration, stdio
                                      transport, and server startup

  Backend API returns 404             Verify actual Express routes and
                                      API prefix

  Backend connection refused          Start backend and verify host/port

  Booking result is incorrect         Reuse the existing booking service
                                      and timezone/capacity logic

  Sensitive data exposure             Apply authentication,
                                      authorization, and response
                                      filtering

  Secrets accidentally committed      Remove them from repository history
                                      as appropriate and rotate exposed
                                      credentials
  -----------------------------------------------------------------------

## 11. Final Completion Checklist

-   [ ] Existing BAKEBERRY project analyzed.
-   [ ] Existing backend routes and models verified.
-   [ ] MCP server created using the official SDK.
-   [ ] At least two functional MCP tools implemented.
-   [ ] All four planned tools implemented, if applicable.
-   [ ] MCP server builds and starts successfully.
-   [ ] Claude Desktop configuration completed.
-   [ ] Claude Desktop connection verified.
-   [ ] `tools/list` tested.
-   [ ] `tools/call` tested for each implemented tool.
-   [ ] MCP Inspector testing completed.
-   [ ] Real API integration verified.
-   [ ] Booking and stock rules preserved.
-   [ ] Authentication and authorization verified.
-   [ ] README and architecture documentation updated.
-   [ ] AI context-management documentation completed.
-   [ ] Prompt history documented.
-   [ ] Challenges and solutions documented.
-   [ ] Secrets excluded from GitHub.
-   [ ] GitHub repository updated.
-   [ ] Presentation and demo prepared.
-   [ ] Excel submission links prepared.

## 12. Recommended Implementation Order

For a reliable demonstration, implement in this order:

1.  Analyze the real BAKEBERRY project.
2.  Build the MCP server.
3.  Complete and test `get_available_cakes`.
4.  Complete and test `check_booking_availability`.
5.  Connect the server to Claude Desktop.
6.  Demonstrate `tools/list` and `tools/call`.
7.  Add order and inventory tools with proper access controls.
8.  Complete documentation, GitHub, presentation, and submission files.

**Important:** This document is an implementation plan, not evidence
that the MCP server has already been integrated or tested. Actual
endpoint names, folder paths, environment variables, and business rules
must be verified from the current BAKEBERRY source code before
implementation.

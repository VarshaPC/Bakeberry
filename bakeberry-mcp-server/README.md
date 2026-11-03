# BAKEBERRY MCP Server

TypeScript/Node.js stdio MCP server that connects MCP-compatible AI hosts to the BAKEBERRY REST API.

See the [complete MCP server documentation](../docs/MCP_Server_Documentation.md) for requirements, installation, environment configuration, Claude Desktop and VS Code setup, tool schemas and behavior, API mappings, access control, troubleshooting, and development guidance.

Quick start:

```powershell
npm install
npm run build
npm start
```

Node.js 20 or later and a running BAKEBERRY backend are required. The default API URL is `http://127.0.0.1:4000/api/v1`. Configure and launch this process through your MCP host to use its tools.

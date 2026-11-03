import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getAvailableCakesTool } from "./tools/cakes.js";
import { checkBookingAvailabilityTool } from "./tools/bookings.js";
import { getOrderStatusTool } from "./tools/orders.js";
import { getInventorySummaryTool } from "./tools/inventory.js";

const server = new Server(
  {
    name: "bakeberry-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const tools = [
  getAvailableCakesTool,
  checkBookingAvailabilityTool,
  getOrderStatusTool,
  getInventorySummaryTool,
];

// Handle listing tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

// Handle executing a tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const tool = tools.find((t) => t.name === name);

  if (!tool) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Unknown tool requested: '${name}'`,
        },
      ],
    };
  }

  try {
    return await tool.handler((args as any) || {});
  } catch (err: any) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Tool execution failed: ${err.message || String(err)}`,
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("BAKEBERRY MCP Server initialized successfully on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting BAKEBERRY MCP Server:", err);
  process.exit(1);
});


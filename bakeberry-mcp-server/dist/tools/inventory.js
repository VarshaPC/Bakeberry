import { apiClient } from "../services/api-client.js";
import { formatInventorySummary } from "../utils/formatters.js";
import { config } from "../config.js";
export const getInventorySummaryTool = {
    name: "get_inventory_summary",
    description: "Retrieve the bakery inventory summary, including stock, reserved counts, available items, and production capacity. Requires staff or admin authorization.",
    inputSchema: {
        type: "object",
        properties: {
            adminToken: {
                type: "string",
                description: "Optional Admin/Staff JWT Bearer token. If omitted, uses BAKEBERRY_ADMIN_TOKEN from environment",
            },
        },
    },
    handler: async (args) => {
        try {
            const token = args.adminToken || config.adminToken;
            if (!token) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: "Admin authorization required: Viewing inventory requires staff or admin credentials. Please provide an admin/staff JWT token or configure BAKEBERRY_ADMIN_TOKEN in the environment.",
                        },
                    ],
                };
            }
            const data = await apiClient.get("/admin/inventory", undefined, token);
            return {
                content: [
                    {
                        type: "text",
                        text: formatInventorySummary(data.items),
                    },
                ],
            };
        }
        catch (error) {
            return {
                isError: true,
                content: [
                    {
                        type: "text",
                        text: `Error retrieving inventory summary: ${error.message || String(error)}`,
                    },
                ],
            };
        }
    },
};
//# sourceMappingURL=inventory.js.map
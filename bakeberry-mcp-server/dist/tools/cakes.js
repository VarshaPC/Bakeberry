import { apiClient } from "../services/api-client.js";
import { formatCakesResponse } from "../utils/formatters.js";
export const getAvailableCakesTool = {
    name: "get_available_cakes",
    description: "Retrieve active cakes, variants, prices, flavors, and stock/availability from the BAKEBERRY catalog. You can filter by category or search term.",
    inputSchema: {
        type: "object",
        properties: {
            category: {
                type: "string",
                description: "Optional category filter (e.g., 'chocolate', 'fruit', 'celebration', 'wedding')",
            },
            search: {
                type: "string",
                description: "Optional keyword search for cake name or description",
            },
            page: {
                type: "number",
                description: "Page number (defaults to 1)",
            },
            limit: {
                type: "number",
                description: "Items per page (defaults to 12, max 50)",
            },
        },
    },
    handler: async (args) => {
        try {
            const page = args.page || 1;
            const limit = args.limit || 12;
            const params = { page, limit };
            if (args.category)
                params.category = args.category;
            if (args.search)
                params.search = args.search;
            const data = await apiClient.get("/cakes", params);
            return {
                content: [
                    {
                        type: "text",
                        text: formatCakesResponse(data.items, data.total, data.page),
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
                        text: `Error retrieving cakes from BAKEBERRY: ${error.message || String(error)}`,
                    },
                ],
            };
        }
    },
};
//# sourceMappingURL=cakes.js.map
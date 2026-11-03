import { apiClient } from "../services/api-client.js";
import { formatOrderStatus } from "../utils/formatters.js";
import { config } from "../config.js";
export const getOrderStatusTool = {
    name: "get_order_status",
    description: "Retrieve the status, item details, delivery/pickup schedule, and payment state of a BAKEBERRY order. Enforces customer data privacy and authentication.",
    inputSchema: {
        type: "object",
        properties: {
            orderId: {
                type: "string",
                description: "The 24-character hexadecimal MongoDB Order ID",
            },
            authToken: {
                type: "string",
                description: "Optional customer JWT Bearer token. If omitted, uses BAKEBERRY_CUSTOMER_TOKEN from environment",
            },
        },
        required: ["orderId"],
    },
    handler: async (args) => {
        try {
            const token = args.authToken || config.customerToken;
            if (!token) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: "Authentication required: To protect customer privacy and order ownership, please provide a customer JWT auth token or configure BAKEBERRY_CUSTOMER_TOKEN in the environment.",
                        },
                    ],
                };
            }
            if (!/^[0-9a-fA-F]{24}$/.test(args.orderId)) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: "Invalid order ID format. Expected a 24-character hexadecimal MongoDB ObjectId.",
                        },
                    ],
                };
            }
            const data = await apiClient.get(`/orders/${args.orderId}`, undefined, token);
            return {
                content: [
                    {
                        type: "text",
                        text: formatOrderStatus(data.order),
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
                        text: `Error fetching order status: ${error.message || String(error)}`,
                    },
                ],
            };
        }
    },
};
//# sourceMappingURL=orders.js.map
export declare const getOrderStatusTool: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            orderId: {
                type: string;
                description: string;
            };
            authToken: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    handler: (args: {
        orderId: string;
        authToken?: string;
    }) => Promise<{
        isError: boolean;
        content: {
            type: string;
            text: string;
        }[];
    } | {
        isError?: undefined;
        content: {
            type: string;
            text: string;
        }[];
    }>;
};

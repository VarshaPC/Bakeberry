export declare const getInventorySummaryTool: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            adminToken: {
                type: string;
                description: string;
            };
        };
    };
    handler: (args: {
        adminToken?: string;
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

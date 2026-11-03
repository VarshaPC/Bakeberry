export declare const getAvailableCakesTool: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            category: {
                type: string;
                description: string;
            };
            search: {
                type: string;
                description: string;
            };
            page: {
                type: string;
                description: string;
            };
            limit: {
                type: string;
                description: string;
            };
        };
    };
    handler: (args: {
        category?: string;
        search?: string;
        page?: number;
        limit?: number;
    }) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
        isError?: undefined;
    } | {
        isError: boolean;
        content: {
            type: string;
            text: string;
        }[];
    }>;
};

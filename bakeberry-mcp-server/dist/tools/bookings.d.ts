export declare const checkBookingAvailabilityTool: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            date: {
                type: string;
                description: string;
            };
            endDate: {
                type: string;
                description: string;
            };
            cakeId: {
                type: string;
                description: string;
            };
            variantId: {
                type: string;
                description: string;
            };
            slot: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    handler: (args: {
        date: string;
        endDate?: string;
        cakeId?: string;
        variantId?: string;
        slot?: string;
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

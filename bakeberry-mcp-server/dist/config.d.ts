export interface ServerConfig {
    apiUrl: string;
    adminToken?: string;
    customerToken?: string;
    shopTimezone: string;
    minBookingDays: number;
}
export declare const config: ServerConfig;

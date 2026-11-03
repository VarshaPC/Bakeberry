export declare class ApiClient {
    private baseUrl;
    constructor(baseUrl?: string);
    get<T>(path: string, params?: Record<string, any>, token?: string): Promise<T>;
    post<T>(path: string, data?: any, token?: string): Promise<T>;
    private handleError;
}
export declare const apiClient: ApiClient;

import axios from "axios";
import { config } from "../config.js";
export class ApiClient {
    baseUrl;
    constructor(baseUrl) {
        this.baseUrl = baseUrl || config.apiUrl;
    }
    async get(path, params, token) {
        const headers = {};
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        try {
            const response = await axios.get(`${this.baseUrl}${path}`, {
                params,
                headers,
                timeout: 10000,
            });
            return response.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async post(path, data, token) {
        const headers = {};
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        try {
            const response = await axios.post(`${this.baseUrl}${path}`, data, {
                headers,
                timeout: 10000,
            });
            return response.data;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    handleError(error) {
        if (axios.isAxiosError(error)) {
            const axiosErr = error;
            if (axiosErr.code === "ECONNREFUSED" || !axiosErr.response) {
                return new Error(`Unable to connect to BAKEBERRY API server at ${this.baseUrl}. Please verify the backend is running.`);
            }
            const backendError = axiosErr.response.data?.error;
            if (backendError && backendError.message) {
                const detailsStr = backendError.details ? ` Details: ${JSON.stringify(backendError.details)}` : "";
                return new Error(`[${backendError.code || axiosErr.response.status}] ${backendError.message}${detailsStr}`);
            }
            return new Error(`BAKEBERRY API error (HTTP ${axiosErr.response.status}): ${axiosErr.message}`);
        }
        return error instanceof Error ? error : new Error(String(error));
    }
}
export const apiClient = new ApiClient();
//# sourceMappingURL=api-client.js.map
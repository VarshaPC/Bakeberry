import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { config } from "../config.js";

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || config.apiUrl;
  }

  async get<T>(path: string, params?: Record<string, any>, token?: string): Promise<T> {
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await axios.get<T>(`${this.baseUrl}${path}`, {
        params,
        headers,
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async post<T>(path: string, data?: any, token?: string): Promise<T> {
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await axios.post<T>(`${this.baseUrl}${path}`, data, {
        headers,
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const axiosErr = error as AxiosError<{ error?: { code?: string; message?: string; details?: any } }>;
      if (axiosErr.code === "ECONNREFUSED" || !axiosErr.response) {
        return new Error(
          `Unable to connect to BAKEBERRY API server at ${this.baseUrl}. Please verify the backend is running.`
        );
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


import { near } from './near';
import { sign } from 'near-sign-verify';

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async makeRequest<TResponse, TRequest = unknown>(
    method: string,
    path: string,
    auth: { currentAccountId: string | null; isSignedIn: boolean },
    requestData?: TRequest,
    message?: string, // Descriptive message for signing non-GET requests
  ): Promise<TResponse> {
    const fullUrl = new URL(this.baseUrl + path, window.location.origin);
    const bodyString = (method !== 'GET' && method !== 'DELETE' && requestData) ? JSON.stringify(requestData) : undefined;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (method !== 'GET' && method !== 'DELETE' && requestData) {
      headers['Content-Type'] = 'application/json';
    }


    if (method === 'GET') {
      if (auth.currentAccountId) {
        headers['X-Near-Account'] = auth.currentAccountId;
      }
    } else { // Non-GET requests (POST, PUT, DELETE, PATCH)
      if (!auth.currentAccountId) {
          throw new ApiError('Account ID missing for authenticated request.', 400);
      }

      const messageForSigning = message || `${method} request to ${path}`;
      
      const authToken = await sign({
        signer: near,
        recipient: 'curatefun.near',
        message: messageForSigning,
      });

      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const requestOptions: RequestInit = {
      method,
      headers,
    };

    if (bodyString) {
      requestOptions.body = bodyString;
    }
    
    const response = await fetch(fullUrl.toString(), requestOptions);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        // If response is not JSON, try to get text, otherwise use statusText
        const responseText = await response.text().catch(() => response.statusText);
        errorData = { message: responseText };
      }
      throw new ApiError(
        `API request failed: ${response.status} ${errorData.message || response.statusText}`,
        response.status,
        errorData
      );
    }

    if (response.status === 204) { // No Content
      return undefined as unknown as TResponse;
    }

    // Check if response has content before trying to parse JSON
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json() as Promise<TResponse>;
    } else {
      // Handle non-JSON responses, e.g. plain text or empty body for 200 OK
      // For now, returning undefined if not JSON, adjust as needed
      return undefined as unknown as TResponse;
    }
  }
}

export const apiClient = new ApiClient('/api');

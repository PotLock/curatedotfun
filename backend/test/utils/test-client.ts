import axios, { AxiosInstance } from "axios";

/**
 * Creates an HTTP client for testing the API
 * @param port The port number the server is running on
 * @returns An Axios instance configured for testing
 */
export function createTestClient(port: number): AxiosInstance {
  return axios.create({
    baseURL: `http://localhost:${port}`,
    validateStatus: () => true, // Don't throw on non-2xx responses
    headers: {
      "Content-Type": "application/json",
    },
  });
}

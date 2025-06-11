import { Logger } from "pino";

export class SecretServiceApiClient {
  private baseUrl: string;
  private apiKey: string;
  private logger: Logger;

  constructor(baseUrl: string, apiKey: string, logger: Logger) {
    if (!baseUrl) {
      throw new Error("SecretServiceApiClient: baseUrl is required.");
    }
    if (!apiKey) {
      throw new Error("SecretServiceApiClient: apiKey is required.");
    }
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    this.apiKey = apiKey;
    this.logger = logger;
    this.logger.info(
      `SecretServiceApiClient initialized for URL: ${this.baseUrl}`,
    );
  }

  private async makeRequest<T>(endpoint: string, body: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    this.logger.debug(`SecretServiceApiClient: Making request to ${url}`, {
      body,
    });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let errorData: any = {
          error: `Request failed with status ${response.status}`,
        };
        try {
          errorData = await response.json();
        } catch (e) {
          this.logger.warn(
            `SecretServiceApiClient: Could not parse error response as JSON from ${url}. Status: ${response.status}`,
          );
        }
        this.logger.error(
          `SecretServiceApiClient: API error for ${endpoint}. Status: ${response.status}`,
          { responseBody: errorData },
        );
        throw new Error(
          `SecretService error: ${errorData.error || response.statusText || "Unknown error"}`,
        );
      }

      const responseText = await response.text();
      if (!responseText) {
        this.logger.info(
          `SecretServiceApiClient: Received empty successful response from ${url}`,
        );
        return {} as T;
      }

      return JSON.parse(responseText) as T;
    } catch (error: any) {
      this.logger.error(
        `SecretServiceApiClient: Error communicating with SecretService at ${url}.`,
        { errorMessage: error.message, error },
      );
      throw new Error(
        `Failed to communicate with secret service: ${error.message}`,
      );
    }
  }

  async getPlaintextSecret(
    feedId: string,
    keyName: string,
  ): Promise<string | null> {
    this.logger.debug(
      `SecretServiceApiClient: Requesting plaintext secret for feedId: ${feedId}, keyName: ${keyName}`,
    );
    try {
      type PlaintextResponse = { plaintext: string };

      const result = await this.makeRequest<
        PlaintextResponse | { error?: string }
      >("/v1/secrets/get-plaintext", {
        feedId,
        keyName,
      });

      if ("error" in result && result.error) {
        this.logger.warn(
          `SecretServiceApiClient: getPlaintextSecret failed for '${keyName}', feed '${feedId}'. Error: ${result.error}`,
        );
        return null;
      }
      if ("plaintext" in result) {
        this.logger.info(
          `SecretServiceApiClient: Successfully retrieved plaintext secret for '${keyName}', feed '${feedId}'.`,
        );
        return (result as PlaintextResponse).plaintext;
      }
      this.logger.warn(
        `SecretServiceApiClient: Unexpected response format for getPlaintextSecret for '${keyName}', feed '${feedId}'.`,
      );
      return null;
    } catch (error: any) {
      this.logger.warn(
        `SecretServiceApiClient: Could not retrieve plaintext secret '${keyName}' for feed '${feedId}'. Error: ${error.message}`,
      );
      return null;
    }
  }

  async signPayloadWithNearKey(
    feedId: string,
    keyName: string,
    payload: string,
  ): Promise<{ signature: string; publicKey: string } | null> {
    this.logger.debug(
      `SecretServiceApiClient: Requesting NEAR signature for feedId: ${feedId}, keyName: ${keyName}`,
    );
    try {
      type NearSignatureResponse = { signature: string; publicKey: string };

      const result = await this.makeRequest<
        NearSignatureResponse | { error?: string }
      >("/v1/secrets/sign-near", {
        feedId,
        keyName,
        payload,
      });

      if ("error" in result && result.error) {
        this.logger.warn(
          `SecretServiceApiClient: signPayloadWithNearKey failed for '${keyName}', feed '${feedId}'. Error: ${result.error}`,
        );
        return null;
      }
      if ("signature" in result && "publicKey" in result) {
        this.logger.info(
          `SecretServiceApiClient: Successfully signed payload with NEAR key for '${keyName}', feed '${feedId}'.`,
        );
        return result as NearSignatureResponse;
      }
      this.logger.warn(
        `SecretServiceApiClient: Unexpected response format for signPayloadWithNearKey for '${keyName}', feed '${feedId}'.`,
      );
      return null;
    } catch (error: any) {
      this.logger.warn(
        `SecretServiceApiClient: Could not sign payload with NEAR key '${keyName}' for feed '${feedId}'. Error: ${error.message}`,
      );
      return null;
    }
  }
}

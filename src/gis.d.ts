declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenClientConfig {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
      }

      interface TokenResponse {
        access_token: string;
        error?: string;
        error_description?: string;
      }

      interface TokenClient {
        requestAccessToken(overrideConfig?: { prompt?: string }): void;
      }

      function initTokenClient(config: TokenClientConfig): TokenClient;
      function revoke(token: string, done: () => void): void;
    }
  }
}

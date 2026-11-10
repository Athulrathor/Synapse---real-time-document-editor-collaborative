import { env } from "@/libs/env";
import { useAuthStore } from "@/stores/auth-store-ui";
import type { AuthUser } from "@/stores/auth-store-ui";

const API_BASE_URL = env.urls.apiUrl ?? "http://localhost:4000/api/v1";

type ApiRequestOptions = RequestInit & {
  json?: unknown;
  retryOnUnauthorized?: boolean;
};

type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

type ApiErrorBody = {
  message?: string | string[];
  error?:
    | string
    | {
        message?: string | string[];
        code?: string;
      };
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let refreshPromise: Promise<AuthResponse> | null = null;

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function createHeaders(
  headers?: HeadersInit,
  token?: string | null,
  hasJsonBody = false,
): Headers {
  const result = new Headers(headers);

  if (hasJsonBody && !result.has("Content-Type")) {
    result.set("Content-Type", "application/json");
  }

  if (token) {
    result.set("Authorization", `Bearer ${token}`);
  } else {
    result.delete("Authorization");
  }

  return result;
}

async function readError(response: Response): Promise<ApiError> {
  let message = `Request failed with status ${response.status}`;

  try {
    const body = (await response.json()) as ApiErrorBody;

    if (typeof body.message === "string") {
      message = body.message;
    } else if (Array.isArray(body.message)) {
      message = body.message.join(", ");
    } else if (typeof body.error === "string") {
      message = body.error;
    } else if (body.error && typeof body.error === "object") {
      const nestedMessage = body.error.message;

      if (typeof nestedMessage === "string") {
        message = nestedMessage;
      } else if (Array.isArray(nestedMessage)) {
        message = nestedMessage.join(", ");
      } else if (body.error.code) {
        message = body.error.code;
      }
    }
  } catch {
    // Keep the default message if the response is not valid JSON.
  }

  return new ApiError(message, response.status);
}

/**
 * Refresh the access token using the backend's HttpOnly cookie.
 * Concurrent callers share the same refresh operation.
 */
export async function refreshAccessToken(): Promise<AuthResponse> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(buildUrl("/auth/refresh"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          const store = useAuthStore.getState();

          store.clearSession();
          store.setStatus("unauthenticated");
        }

        throw await readError(response);
      }

      const data = (await response.json()).data as AuthResponse;

      if (!data.accessToken) {
        throw new Error("The refresh endpoint did not return an access token.");
      }

      const store = useAuthStore.getState();

      const user = data.user ?? store.user;

      if (user) {
        store.setSession(user, data.accessToken);
      } else {
        // Save the token so initializeAuth can call /auth/me.
        store.setAccessToken(data.accessToken);
      }

      return data;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

/**
 * Shared native-fetch API client.
 *
 * Existing service calls can continue using:
 * apiRequest<T>(path, { method: "POST", json: input })
 */

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { json, retryOnUnauthorized = true, ...requestOptions } = options;

  const url = buildUrl(path);
  const isFormData = json instanceof FormData;
  const hasJsonBody = json !== undefined && !isFormData;

  const makeRequest = (token: string | null) => {
    const headers = createHeaders(
      requestOptions.headers,
      token,
      hasJsonBody,
    );

    // Never set Content-Type manually for FormData.
    if (isFormData) {
      headers.delete("Content-Type");
    }

    const init: RequestInit = {
      ...requestOptions,
      headers,
      credentials: requestOptions.credentials ?? "include",
    };

    if (isFormData) {
      init.body = json;
    } else if (hasJsonBody) {
      init.body = JSON.stringify(json);
    }

    return fetch(url, init);
  };

  const tokenBeforeRequest = useAuthStore.getState().accessToken;

  let response = await makeRequest(tokenBeforeRequest);

  if (response.status === 401 && retryOnUnauthorized) {
    let newToken: string;

    try {
      const currentToken = useAuthStore.getState().accessToken;

      if (refreshPromise) {
        newToken = (await refreshPromise).accessToken;
      } else if (currentToken && currentToken !== tokenBeforeRequest) {
        newToken = currentToken;
      } else {
        newToken = (await refreshAccessToken()).accessToken;
      }
    } catch (error) {
      throw error;
    }

    response = await makeRequest(newToken);
  }

  if (!response.ok) {
    throw await readError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    return undefined as T;
  }

  return (await response.json()).data as T;
}


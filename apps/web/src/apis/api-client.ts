import { env } from "@/libs/env";
import { ApiErrorResponse,ApiError } from "./api-error";

export const API_BASE_URL = env.urls.apiUrl;

interface RequestOptions extends RequestInit {
  json?: unknown;
  accessToken?: string;
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { json, accessToken, headers, ...fetchOptions } = options;

  const requestHeaders = new Headers(headers);

  if (json !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (accessToken) {
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  let body = fetchOptions.body;

  if (json !== undefined) {
    body = JSON.stringify(json);
  }

  // FormData must be passed through `body`, not `json`.
  // Do not set Content-Type manually for FormData.
  if (body instanceof FormData) {
    requestHeaders.delete("Content-Type");
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    body,
    headers: requestHeaders,
    credentials: "include",
  });

  const responseText = await response.text();

  let data: unknown;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }
  }

  if (!response.ok) {
    const details = isApiErrorResponse(data) ? data : {};

    const message = Array.isArray(details.message)
      ? details.message.join(", ")
      : typeof details.message === "string"
        ? details.message
        : typeof data === "string" && data.length > 0
          ? data
          : `Request failed with status ${response.status}`;

    throw new ApiError(response.status, message, details);
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "success" in data &&
    "data" in data
  ) {
    return (data as { data: T }).data;
  }

  return data as T;
}

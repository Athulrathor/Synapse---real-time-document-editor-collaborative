function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function validateUrl(
  value: string,
  name: string,
  allowedProtocols: string[],
): string {
  try {
    const url = new URL(value);

    if (!allowedProtocols.includes(url.protocol)) {
      throw new Error();
    }

    return value.replace(/\/+$/, "");
  } catch {
    throw new Error(
      `${name} must be a valid URL using: ${allowedProtocols.join(", ")}`,
    );
  }
}

export const env = {
  urls: {
    // apiUrl: validateUrl(
    //   getRequiredEnv("NEXT_PUBLIC_API_URL"),
    //   "NEXT_PUBLIC_API_URL",
    //   ["http:", "https:"],
    // ),
    apiUrl: process.env["NEXT_PUBLIC_API_URL"],
    socketUrl: "NEXT_PUBLIC_WS_URL"
    // socketUrl: validateUrl(
    //   getRequiredEnv("NEXT_PUBLIC_WS_URL"),
    //   "NEXT_PUBLIC_WS_URL",
    //   ["ws:", "wss:"],
    // ),
  },
} as const;
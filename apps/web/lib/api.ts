export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

export function getApiUrl(path: string) {
  if (!API_URL) {
    throw new ApiError(
      "The API URL is not configured. Please check deployment settings.",
      500,
    );
  }

  const normalizedBase = API_URL.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(getApiUrl(path), init);
  } catch {
    throw new ApiError(
      "Unable to reach VitaScan right now. Please try again.",
      0,
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      typeof payload?.message === "string"
        ? payload.message
        : "Something went wrong. Please try again.",
      response.status,
    );
  }

  return payload as T;
}

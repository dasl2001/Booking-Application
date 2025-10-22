// src/lib/api.ts
export async function api<TResponse = unknown, TBody = unknown>(
  url: string,
  init: RequestInit & { json?: TBody } = {}
): Promise<TResponse> {
  const { json, headers, ...rest } = init;

  const res = await fetch(url, {
    credentials: "include", // httpOnly-cookies
    cache: "no-store",      // undvik cachead auth-status
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
    ...(json ? { body: JSON.stringify(json) } : {}),
    ...rest,
  });

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      // vi antar att backend returnerar ett JSON-objekt med ev. "error"
      const data: unknown = await res.json();
      if (
        data &&
        typeof data === "object" &&
        "error" in data &&
        typeof (data as { error?: string }).error === "string"
      ) {
        msg = (data as { error: string }).error;
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(msg);
  }

  // returnera JSON strikt typat som TResponse
  return (await res.json()) as TResponse;
}

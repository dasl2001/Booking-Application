// src/lib/api.ts
export async function api<T = any>(
  url: string,
  init: RequestInit & { json?: any } = {}
): Promise<T> {
  const { json, headers, ...rest } = init;

  const res = await fetch(url, {
    credentials: "include",      // 👈 viktigt för httpOnly-cookies
    cache: "no-store",           // undvik cachead auth-status
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    ...(json ? { body: JSON.stringify(json) } : {}),
    ...rest,
  });

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}




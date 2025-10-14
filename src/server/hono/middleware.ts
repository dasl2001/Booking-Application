import { getCookie } from "hono/cookie";
import type { MiddlewareHandler } from "hono";
import { supa } from "@/lib/supabase";
import type { Vars } from "./types";

export const supabaseMiddleware: MiddlewareHandler<{ Variables: Vars }> = async (c, next) => {
  const cookieJwt = getCookie(c, "sb-access-token");
  const auth = c.req.header("authorization");
  const jwt = cookieJwt ?? (auth?.startsWith("Bearer ") ? auth.split(" ")[1] : undefined);

  const client = supa(jwt);
  c.set("supa", client);

  const { data } = await client.auth.getUser();
  c.set("authUser", data.user ? { id: data.user.id } : null);

  await next();
};

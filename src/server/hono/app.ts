import { Hono } from "hono";
import type { Vars } from "./types";
import { ZodError } from "zod";

export const app = new Hono<{ Variables: Vars }>().basePath("/api"); // /auth -> /api/auth osv

// Global errorformatter
app.onError((err, c) => {
  const cause = (err as Error & { cause?: unknown }).cause;

  if (cause instanceof ZodError) {
    return c.json({ error: "Validation error", issues: cause.issues }, 400);
  }

  const message = err instanceof Error ? err.message : "Internal error";
  return c.json({ error: message ?? "Internal error" }, 500);
});

// Healthcheck -> GET /api/__up
app.get("/__up", (c) => c.text("ok"));

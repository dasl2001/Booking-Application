import { Hono } from "hono";
import type { Vars } from "./types";

export const app = new Hono<{ Variables: Vars }>()
  .basePath("/api"); // /auth -> /api/auth osv
  app.get("/my/properties", (c) => c.redirect("/api/properties/my", 308));

// Global errorformatter
app.onError((err, c) => {
  const issues = (err as any)?.cause?.issues;
  if (issues) return c.json({ error: "Validation error", issues }, 400);
  return c.json({ error: err?.message ?? "Internal error" }, 500);
});

// Healthcheck -> GET /api/__up
app.get("/__up", (c) => c.text("ok"));

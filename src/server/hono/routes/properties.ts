import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { propertyCreate, propertyPatch } from "@/lib/schemas";
import { requireAuth, currentUserId } from "../utils";
import { supaAdmin } from "@/lib/supabase";
import type { Vars } from "../types";
import { z } from "zod";

export const properties = new Hono<{ Variables: Vars }>();

// Lista alla (publikt eller enligt RLS)
properties.get("/", async (c) => {
  const db = c.get("supa");
  const { data, error } = await db
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ properties: data });
});

// Mina properties
properties.get("/my", async (c) => {
  const unauth = requireAuth(c);
  if (unauth) return unauth;

  const db = c.get("supa");
  const auth = c.get("authUser");
  if (!auth) return c.json({ error: "Unauthorized" }, 401);

  const owner_id = await currentUserId(db, auth.id);

  const { data, error } = await db
    .from("properties")
    .select("*")
    .eq("owner_id", owner_id)
    .order("created_at", { ascending: false });

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ properties: data });
});

// Andras (bokningsbara)
properties.get("/others", async (c) => {
  const unauth = requireAuth(c);
  if (unauth) return unauth;

  const db = c.get("supa");
  const auth = c.get("authUser");
  if (!auth) return c.json({ error: "Unauthorized" }, 401);

  const myId = await currentUserId(db, auth.id);

  const { data, error } = await db
    .from("properties")
    .select("*")
    .neq("owner_id", myId)
    .eq("availability", true)
    .order("created_at", { ascending: false });

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ properties: data });
});

// Skapa property
properties.post("/", zValidator("json", propertyCreate), async (c) => {
  const unauth = requireAuth(c);
  if (unauth) return unauth;

  const db = c.get("supa");
  const auth = c.get("authUser");
  if (!auth) return c.json({ error: "Unauthorized" }, 401);

  const owner_id = await currentUserId(db, auth.id);
  const body = c.req.valid("json");

  const { data, error } = await db
    .from("properties")
    .insert({ ...body, owner_id })
    .select("*")
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ property: data }, 201);
});

// Uppdatera property (med ägarkontroll)
properties.patch("/:id", zValidator("json", propertyPatch), async (c) => {
  const unauth = requireAuth(c);
  if (unauth) return unauth;

  const db = c.get("supa");
  const auth = c.get("authUser");
  if (!auth) return c.json({ error: "Unauthorized" }, 401);

  const { id } = c.req.param();
  const me = await currentUserId(db, auth.id);

  // kontrollera att jag äger property
  const { data: ownerRow, error: getErr } = await db
    .from("properties")
    .select("owner_id")
    .eq("id", id)
    .single();

  if (getErr || !ownerRow) return c.json({ error: "Property not found" }, 404);
  if (ownerRow.owner_id !== me) return c.json({ error: "Forbidden" }, 403);

  const patch = c.req.valid("json");

  const { data, error } = await db
    .from("properties")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ property: data });
});

// Ta bort property (med ägarkontroll)
properties.delete("/:id", async (c) => {
  const unauth = requireAuth(c);
  if (unauth) return unauth;

  const db = c.get("supa");
  const auth = c.get("authUser");
  if (!auth) return c.json({ error: "Unauthorized" }, 401);

  const { id } = c.req.param();
  const me = await currentUserId(db, auth.id);

  const { data: ownerRow, error: getErr } = await db
    .from("properties")
    .select("owner_id")
    .eq("id", id)
    .single();

  if (getErr || !ownerRow) return c.json({ error: "Property not found" }, 404);
  if (ownerRow.owner_id !== me) return c.json({ error: "Forbidden" }, 403);

  const { error } = await db.from("properties").delete().eq("id", id);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

// 🔹 Ny: Hämta en specifik property
properties.get("/:id", async (c) => {
  const db = c.get("supa");
  const { id } = c.req.param();

  const { data, error } = await db
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return c.json({ error: "Property not found" }, 404);

  return c.json({ property: data });
});

// Query-schema för /:id/is-booked
const isBookedQuery = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// Är boendet bokat? (valfria query: from=YYYY-MM-DD, to=YYYY-MM-DD)
// Använder service role för korrekt count trots RLS.
properties.get("/:id/is-booked", zValidator("query", isBookedQuery), async (c) => {
  const admin = supaAdmin();
  const { id } = c.req.param();
  const { from, to } = c.req.valid("query");

  let q = admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("property_id", id);

  if (from && to) {
    // overlap: inte (out <= from) och inte (in >= to)
    q = q.not("check_out_date", "lte", from).not("check_in_date", "gte", to);
  }

  const { count, error } = await q;
  if (error) return c.json({ error: error.message }, 400);

  return c.json({
    is_booked: (count ?? 0) > 0,
    count: count ?? 0,
    scope: from && to ? { from, to } : "any",
  });
});

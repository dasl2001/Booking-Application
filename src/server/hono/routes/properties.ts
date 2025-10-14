import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { propertyCreate, propertyPatch } from "@/lib/schemas";
import { requireAuth, currentUserId } from "../utils";
import { supaAdmin } from "@/lib/supabase";
import type { Vars } from "../types";

export const properties = new Hono<{ Variables: Vars }>();

// Lista alla (admin/debug eller publik, beroende på RLS)
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
  const auth = c.get("authUser")!;
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
  const auth = c.get("authUser")!;
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
  const auth = c.get("authUser")!;
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

// Uppdatera property
properties.patch("/:id", zValidator("json", propertyPatch), async (c) => {
  const unauth = requireAuth(c);
  if (unauth) return unauth;

  const db = c.get("supa");
  const { id } = c.req.param();
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

// Ta bort property
properties.delete("/:id", async (c) => {
  const unauth = requireAuth(c);
  if (unauth) return unauth;

  const db = c.get("supa");
  const { id } = c.req.param();
  const { error } = await db.from("properties").delete().eq("id", id);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

// Är boendet bokat? (valfria query: from=YYYY-MM-DD, to=YYYY-MM-DD)
// Använder service role för korrekt count trots RLS.
properties.get("/:id/is-booked", async (c) => {
  const admin = supaAdmin();
  const { id } = c.req.param();
  const { from, to } = c.req.query();

  let q = admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("property_id", id);

  if (from && to) {
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

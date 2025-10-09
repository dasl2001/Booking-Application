import { Hono, type Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { type SupabaseClient } from "@supabase/supabase-js";
import { supa, supaAdmin } from "@/lib/supabase";
import { propertyCreate, propertyPatch, bookingCreate, registerInput, loginInput } from "@/lib/schemas";
import { calcTotalPrice } from "@/lib/price";

type Vars = { supa: SupabaseClient; authUser: { id: string } | null; };
export const app = new Hono<{ Variables: Vars }>();


// middleware: supabase + auth user
app.use("*", async (c, next) => {
  const auth = c.req.header("authorization");
  const jwt = auth?.startsWith("Bearer ") ? auth.split(" ")[1] : undefined;
  const client = supa(jwt);
  c.set("supa", client);
  const { data } = await client.auth.getUser();
  c.set("authUser", data.user ? { id: data.user.id } : null);
  await next();
});

function requireAuth(c: Context<{ Variables: Vars }>) {
  const u = c.get("authUser");
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  return null;
}

async function currentUserId(db: SupabaseClient, authUserId: string): Promise<string> {
  const { data, error } = await db.from("users").select("id").eq("auth_user_id", authUserId).single();
  if (error || !data) throw new Error("User mapping missing");
  return data.id as string;
}

/** AUTH **/
app.post("/auth/register", zValidator("json", registerInput), async (c) => {
  const { email, password, name } = await c.req.json();
  const anon = c.get("supa");
  const { data, error } = await anon.auth.signUp({ email, password });
  if (error) return c.json({ error: error.message }, 400);

  const admin = supaAdmin();
  const { error: insErr } = await admin.from("users").insert({
    name, email, password: "handled-by-auth", is_admin: false, auth_user_id: data.user!.id,
  });
  if (insErr) return c.json({ error: insErr.message }, 400);

  return c.json({ user: data.user });
});

app.post("/auth/login", zValidator("json", loginInput), async (c) => {
  const { email, password } = await c.req.json();
  const client = c.get("supa");
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ session: data.session });
});

/** PROPERTIES **/
app.get("/properties", async (c) => {
  const db = c.get("supa");
  const { data, error } = await db
    .from("properties")
    .select(`id, owner_id, name, description, location, price_per_night, availability, image_url, created_at,
             users ( name, email )`)
    .order("created_at", { ascending: false });
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ properties: data });
});

app.get("/my/properties", async (c) => {
  const unauth = requireAuth(c); if (unauth) return unauth;
  const db = c.get("supa");
  const auth = c.get("authUser")!;
  const owner_id = await currentUserId(db, auth.id);
  const { data, error } = await db.from("properties").select("*").eq("owner_id", owner_id).order("created_at", { ascending: false });
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ properties: data });
});

app.post("/properties", zValidator("json", propertyCreate), async (c) => {
  const unauth = requireAuth(c); if (unauth) return unauth;
  const db = c.get("supa"); const auth = c.get("authUser")!;
  const owner_id = await currentUserId(db, auth.id);
  const body = await c.req.json();
  const { data, error } = await db.from("properties").insert({ ...body, owner_id }).select("*").single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ property: data }, 201);
});

app.patch("/properties/:id", zValidator("json", propertyPatch), async (c) => {
  const unauth = requireAuth(c); if (unauth) return unauth;
  const db = c.get("supa"); const { id } = c.req.param();
  const patch = await c.req.json();
  const { data, error } = await db.from("properties").update(patch).eq("id", id).select("*").single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ property: data });
});

app.delete("/properties/:id", async (c) => {
  const unauth = requireAuth(c); if (unauth) return unauth;
  const db = c.get("supa"); const { id } = c.req.param();
  const { error } = await db.from("properties").delete().eq("id", id);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

/** BOOKINGS **/
app.get("/bookings", async (c) => {
  const unauth = requireAuth(c); if (unauth) return unauth;
  const db = c.get("supa");
  const { data, error } = await db.from("bookings").select("*, properties(*)").order("created_at", { ascending: false });
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ bookings: data });
});

app.post("/bookings", zValidator("json", bookingCreate), async (c) => {
  const unauth = requireAuth(c); if (unauth) return unauth;
  const db = c.get("supa"); const auth = c.get("authUser")!;
  const user_id = await currentUserId(db, auth.id);
  const { property_id, check_in_date, check_out_date } = await c.req.json();

  const { data: prop, error: pe } = await db.from("properties").select("price_per_night, owner_id").eq("id", property_id).single();
  if (pe || !prop) return c.json({ error: "Property not found" }, 404);
  if (prop.owner_id === user_id) return c.json({ error: "Du kan inte boka din egen property." }, 400);

  const total_price = calcTotalPrice(Number(prop.price_per_night), check_in_date, check_out_date);
  const { data, error } = await db.from("bookings").insert({ user_id, property_id, check_in_date, check_out_date, total_price }).select("*").single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ booking: data }, 201);
});


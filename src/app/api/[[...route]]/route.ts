// src/app/api/[[...route]]/route.ts
import { Hono, type Context } from "hono";
import { handle } from "hono/vercel";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supa, supaAdmin } from "@/lib/supabase";
import {
  propertyCreate,
  propertyPatch,
  bookingCreate,
  registerInput,
  loginInput,
} from "@/lib/schemas";
import { calcTotalPrice } from "@/lib/price";

export const runtime = "nodejs";
const isDev = process.env.NODE_ENV !== "production";

/** ===== App & utils ===== */
type Vars = { supa: SupabaseClient; authUser: { id: string } | null };
const app = new Hono<{ Variables: Vars }>().basePath("/api");

const clean = (v: string) =>
  String(v ?? "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\u2060\u00A0]/g, "")
    .trim();

function requireAuth(c: Context<{ Variables: Vars }>) {
  const u = c.get("authUser");
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  return null;
}
async function currentUserId(db: SupabaseClient, authUserId: string): Promise<string> {
  const { data, error } = await db
    .from("users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .single();
  if (error || !data) throw new Error("User mapping missing");
  return data.id as string;
}

/** ===== Veckohjälp ===== */
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
function weekStart(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay(); // 0=Sun..6=Sat
  const diffToMon = (day + 6) % 7;
  d.setDate(d.getDate() - diffToMon);
  return isoDate(d);
}
function weekEnd(dateStr: string) {
  const start = new Date(weekStart(dateStr) + "T00:00:00");
  start.setDate(start.getDate() + 6);
  return isoDate(start);
}

/** ===== Errors ===== */
app.onError((err, c) => {
  const issues = (err as any)?.cause?.issues;
  if (issues) return c.json({ error: "Validation error", issues }, 400);
  return c.json({ error: err?.message ?? "Internal error" }, 500);
});

/** ===== Health ===== */
app.get("/__up", (c) => c.text("ok"));

/** ===== Middleware: Supabase + authUser ===== */
app.use("*", async (c, next) => {
  const cookieJwt = getCookie(c, "sb-access-token");
  const auth = c.req.header("authorization");
  const jwt = cookieJwt ?? (auth?.startsWith("Bearer ") ? auth.split(" ")[1] : undefined);

  const client = supa(jwt);
  c.set("supa", client);

  const { data } = await client.auth.getUser();
  c.set("authUser", data.user ? { id: data.user.id } : null);

  await next();
});

/** ===== AUTH ===== */
app.post("/auth/register", zValidator("json", registerInput), async (c) => {
  try {
    const { email, password, name } = c.req.valid("json");
    const cleanEmail = clean(email).toLowerCase();
    const cleanPassword = clean(password);
    const cleanName = clean(name);

    const anon = c.get("supa");
    const { data, error } = await anon.auth.signUp({
      email: cleanEmail,
      password: cleanPassword,
    });
    if (error) return c.json({ error: error.message }, 400);

    const admin = supaAdmin();
    const { error: insErr } = await admin.from("users").insert({
      name: cleanName,
      email: cleanEmail,
      password: "handled-by-auth",
      is_admin: false,
      auth_user_id: data.user!.id,
    });
    if (insErr) return c.json({ error: insErr.message }, 400);

    return c.json(
      { ok: true, message: "Konto skapat! Kolla din e-post för verifiering." },
      201
    );
  } catch (e: any) {
    return c.json({ error: e?.message ?? "Internal error" }, 500);
  }
});

app.post("/auth/login", zValidator("json", loginInput), async (c) => {
  try {
    const { email, password } = c.req.valid("json");
    const cleanEmail = clean(email).toLowerCase();
    const cleanPassword = clean(password);

    const client = c.get("supa");
    const { data, error } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword,
    });
    if (error) return c.json({ error: error.message }, 400);

    const access = data.session?.access_token;
    const refresh = data.session?.refresh_token;

    if (access) {
      setCookie(c, "sb-access-token", access, {
        httpOnly: true,
        secure: !isDev,
        sameSite: "Lax",
        path: "/",
        maxAge: 60 * 60 * 2,
      });
    }
    if (refresh) {
      setCookie(c, "sb-refresh-token", refresh, {
        httpOnly: true,
        secure: !isDev,
        sameSite: "Lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return c.json({ ok: true }, 200);
  } catch (e: any) {
    return c.json({ error: e?.message ?? "Internal error" }, 500);
  }
});

app.post("/auth/logout", (c) => {
  deleteCookie(c, "sb-access-token", { path: "/" });
  deleteCookie(c, "sb-refresh-token", { path: "/" });
  return c.json({ ok: true });
});

app.get("/auth/me", (c) => {
  const u = c.get("authUser");
  return c.json({ user: u ?? null }, 200);
});

/** ===== PROPERTIES ===== */
app.get("/properties", async (c) => {
  const db = c.get("supa");
  const { data, error } = await db
    .from("properties")
    .select(
      "id, owner_id, name, description, location, price_per_night, availability, image_url, created_at"
    )
    .order("created_at", { ascending: false });
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ properties: data });
});

app.get("/my/properties", async (c) => {
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

/** Mina properties med snabb bokningsinfo (valfritt att använda i UI) */
app.get("/my/properties/with-bookings", async (c) => {
  const unauth = requireAuth(c);
  if (unauth) return unauth;

  const db = c.get("supa");
  const auth = c.get("authUser")!;
  const owner_id = await currentUserId(db, auth.id);

  const { data, error } = await db
    .from("properties")
    .select(
      `
      id,
      name,
      description,
      price_per_night,
      availability,
      image_url,
      bookings(count),
      latest:bookings(
        check_in_date,
        created_at,
        users(name,email)
      )
    `
    )
    .eq("owner_id", owner_id)
    .order("created_at", { ascending: false })
    .order("created_at", { ascending: false, foreignTable: "latest" })
    .limit(1, { foreignTable: "latest" });

  if (error) return c.json({ error: error.message }, 400);

  const properties = (data ?? []).map((p: any) => {
    const booking_count =
      Array.isArray(p.bookings) && p.bookings[0]?.count != null ? Number(p.bookings[0].count) : 0;

    const latestObj = Array.isArray(p.latest) && p.latest.length > 0 ? p.latest[0] : null;
    const latest_booking = latestObj
      ? {
          check_in_date: latestObj.check_in_date as string,
          created_at: latestObj.created_at as string,
          guest_name: latestObj.users?.name ?? null,
          guest_email: latestObj.users?.email ?? null,
        }
      : null;

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      price_per_night: p.price_per_night,
      availability: p.availability,
      image_url: p.image_url,
      booking_count,
      latest_booking,
    };
  });

  return c.json({ properties });
});

app.get("/properties/others", async (c) => {
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

app.post("/properties", zValidator("json", propertyCreate), async (c) => {
  const unauth = requireAuth(c);
  if (unauth) return unauth;

  const db = c.get("supa");
  const auth = c.get("authUser")!;
  const owner_id = await currentUserId(db, auth.id);
  const body = await c.req.json();

  const { data, error } = await db
    .from("properties")
    .insert({ ...body, owner_id })
    .select("*")
    .single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ property: data }, 201);
});

app.patch("/properties/:id", zValidator("json", propertyPatch), async (c) => {
  const unauth = requireAuth(c);
  if (unauth) return unauth;

  const db = c.get("supa");
  const { id } = c.req.param();
  const patch = await c.req.json();

  const { data, error } = await db
    .from("properties")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ property: data });
});

app.delete("/properties/:id", async (c) => {
  const unauth = requireAuth(c);
  if (unauth) return unauth;

  const db = c.get("supa");
  const { id } = c.req.param();

  const { error } = await db.from("properties").delete().eq("id", id);
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ ok: true });
});

/** ===== BOOKINGS ===== */
app.get("/bookings", async (c) => {
  const unauth = requireAuth(c);
  if (unauth) return unauth;

  const db = c.get("supa");
  const { data, error } = await db
    .from("bookings")
    .select("*, properties(*)")
    .order("created_at", { ascending: false });

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ bookings: data });
});

app.post("/bookings", zValidator("json", bookingCreate), async (c) => {
  const unauth = requireAuth(c);
  if (unauth) return unauth;

  const db = c.get("supa");
  const auth = c.get("authUser")!;
  const user_id = await currentUserId(db, auth.id);

  const { property_id, check_in_date, check_out_date } = await c.req.json();

  const { data: prop, error: pe } = await db
    .from("properties")
    .select("price_per_night, owner_id")
    .eq("id", property_id)
    .single();
  if (pe || !prop) return c.json({ error: "Property not found" }, 404);

  if (prop.owner_id === user_id)
    return c.json({ error: "Du kan inte boka din egen property." }, 400);

  // A) Global datumkrock per användare
  {
    const { data: myOverlap, error: myOvErr } = await db
      .from("bookings")
      .select("id")
      .eq("user_id", user_id)
      .not("check_out_date", "lte", check_in_date)
      .not("check_in_date", "gte", check_out_date);

    if (myOvErr) return c.json({ error: myOvErr.message }, 400);
    if (myOverlap && myOverlap.length > 0) {
      return c.json({ error: "Du har redan en bokning som överlappar dessa datum." }, 400);
    }
  }

  // B) Datumkrock på samma boende
  {
    const { data: overlaps, error: ovErr } = await db
      .from("bookings")
      .select("id")
      .eq("property_id", property_id)
      .not("check_out_date", "lte", check_in_date)
      .not("check_in_date", "gte", check_out_date);

    if (ovErr) return c.json({ error: ovErr.message }, 400);
    if (overlaps && overlaps.length > 0) {
      return c.json({ error: "Datumen är redan bokade för detta boende." }, 400);
    }
  }

  // C) Globalt vecko-skydd (en bokning per användare per vecka)
  {
    const weekStartStr = weekStart(check_in_date);
    const weekEndStr = weekEnd(check_out_date);

    const { data: weekOverlapUser, error: wuErr } = await db
      .from("bookings")
      .select("id")
      .eq("user_id", user_id)
      .not("check_out_date", "lte", weekStartStr)
      .not("check_in_date", "gte", weekEndStr);

    if (wuErr) return c.json({ error: wuErr.message }, 400);
    if (weekOverlapUser && weekOverlapUser.length > 0) {
      return c.json({ error: "Du har redan en bokning samma vecka." }, 400);
    }
  }

  const total_price = calcTotalPrice(
    Number(prop.price_per_night),
    check_in_date,
    check_out_date
  );

  const { data, error } = await db
    .from("bookings")
    .insert({
      user_id,
      property_id,
      check_in_date,
      check_out_date,
      total_price,
    })
    .select("*, properties(*)")
    .single();

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ booking: data }, 201);
});

app.delete("/bookings/:id", async (c) => {
  const unauth = requireAuth(c);
  if (unauth) return unauth;

  const db = c.get("supa");
  const auth = c.get("authUser")!;
  const user_id = await currentUserId(db, auth.id);
  const { id } = c.req.param();

  const { data: booking, error: rErr } = await db
    .from("bookings")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (rErr || !booking) return c.json({ error: "Bokningen finns inte" }, 404);
  if (booking.user_id !== user_id)
    return c.json({ error: "Du saknar behörighet att ta bort denna bokning." }, 403);

  const { error: dErr } = await db.from("bookings").delete().eq("id", id);
  if (dErr) return c.json({ error: dErr.message }, 400);

  return c.json({ ok: true });
});

/** ===== “Är boendet bokat?” =====
 * GET /api/properties/:id/is-booked
 * Query (valfritt): from=YYYY-MM-DD, to=YYYY-MM-DD
 * - Utan from/to: true om det finns minst en bokning.
 * - Med from/to: true om det finns overlap i [from, to).
 */
app.get("/properties/:id/is-booked", async (c) => {
  const unauth = requireAuth(c);
  if (unauth) return unauth;

  const db = c.get("supa");
  const { id } = c.req.param();
  const { from, to } = c.req.query();

  let q = db
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

/** ===== Next.js handlers ===== */
export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);



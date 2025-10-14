import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { bookingCreate } from "@/lib/schemas";
import { calcTotalPrice } from "@/lib/price";
import { requireAuth, currentUserId, weekStart, weekEnd } from "../utils";
import type { Vars } from "../types";

export const bookings = new Hono<{ Variables: Vars }>();

// Mina bokningar (med den associerade propertyn)
bookings.get("/", async (c) => {
  const unauth = requireAuth(c);
  if (unauth) return unauth;

  const db = c.get("supa");
  const auth = c.get("authUser")!;
  const user_id = await currentUserId(db, auth.id);

  const { data, error } = await db
    .from("bookings")
    .select("*, properties(*)")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false });
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ bookings: data });
});

// Skapa bokning
bookings.post("/", zValidator("json", bookingCreate), async (c) => {
  const unauth = requireAuth(c);
  if (unauth) return unauth;

  const db = c.get("supa");
  const auth = c.get("authUser")!;
  const user_id = await currentUserId(db, auth.id);
  const { property_id, check_in_date, check_out_date } = c.req.valid("json");

  // property lookup
  const { data: prop, error: pe } = await db
    .from("properties")
    .select("price_per_night, owner_id")
    .eq("id", property_id)
    .single();
  if (pe || !prop) return c.json({ error: "Property not found" }, 404);

  if (prop.owner_id === user_id)
    return c.json({ error: "Du kan inte boka din egen property." }, 400);

  // A) global overlap per user
  {
    const { data: myOverlap, error: myOvErr } = await db
      .from("bookings")
      .select("id")
      .eq("user_id", user_id)
      .not("check_out_date", "lte", check_in_date)
      .not("check_in_date", "gte", check_out_date);
    if (myOvErr) return c.json({ error: myOvErr.message }, 400);
    if (myOverlap && myOverlap.length > 0)
      return c.json({ error: "Du har redan en bokning som överlappar dessa datum." }, 400);
  }

  // B) overlap on property
  {
    const { data: overlaps, error: ovErr } = await db
      .from("bookings")
      .select("id")
      .eq("property_id", property_id)
      .not("check_out_date", "lte", check_in_date)
      .not("check_in_date", "gte", check_out_date);
    if (ovErr) return c.json({ error: ovErr.message }, 400);
    if (overlaps && overlaps.length > 0)
      return c.json({ error: "Datumen är redan bokade för detta boende." }, 400);
  }

  // C) vecko-skydd per user
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
    if (weekOverlapUser && weekOverlapUser.length > 0)
      return c.json({ error: "Du har redan en bokning samma vecka." }, 400);
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

// Ta bort egen bokning
bookings.delete("/:id", async (c) => {
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

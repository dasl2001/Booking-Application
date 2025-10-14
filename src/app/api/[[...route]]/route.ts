import { handle } from "hono/vercel";
import { app } from "@/server/hono/app";
import { supabaseMiddleware } from "@/server/hono/middleware";
import { auth } from "@/server/hono/routes/auth";
import { properties } from "@/server/hono/routes/properties";
import { bookings } from "@/server/hono/routes/bookings";

export const runtime = "edge";

// middleware för alla API-rutter
app.use("*", supabaseMiddleware);

// mounta routers -> /api/auth/*, /api/properties/*, /api/bookings/*
app.route("/auth", auth);
app.route("/properties", properties);
app.route("/bookings", bookings);

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);

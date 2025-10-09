import { z } from "zod";

export const propertyCreate = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  location: z.string().min(2),
  price_per_night: z.number().positive(),
  availability: z.boolean().optional().default(true),
  image_url: z.string().url().optional().nullable(),
});
export const propertyPatch = propertyCreate.partial();

export const bookingCreate = z.object({
  property_id: z.string().uuid(),
  check_in_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_out_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const registerInput = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

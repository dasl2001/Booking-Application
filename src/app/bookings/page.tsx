// app/bookings/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = false; // måste vara false eller ett nummer i serverfil

import { Suspense } from "react";
import BookingsClient from "./BookingClient";

export default function BookingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Laddar bokningar…</div>}>
      <BookingsClient />
    </Suspense>
  );
}

"use client";
import Link from "next/link";
import { useAuthGuard } from "./(authed)/guard";

export default function HomePage() {
  useAuthGuard();
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Välkommen till BnB</h1>
      <div className="space-x-3">
        <Link className="px-3 py-2 rounded-full bg-rose-600 text-white" href="/properties">Mina properties</Link>
        <Link className="px-3 py-2 rounded-full bg-rose-600 text-white" href="/bookings">Mina bokningar</Link>
      </div>
    </main>
  );
}

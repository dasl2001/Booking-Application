"use client";
import Guard from "./components/Guard";
import Link from "next/link";

export default function HomePage() {
  return (
    <Guard>
      <main className="space-y-4">
        <h1 className="text-2xl font-bold">Välkommen till BnB</h1>
        <div className="space-x-3">
          <Link className="btn" href="/properties">Mina properties</Link>
          <Link className="btn" href="/discover">Boka andras</Link>
          <Link className="btn" href="/bookings">Mina bokningar</Link>
        </div>
      </main>
    </Guard>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Navbar() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await api<{ user: { id: string } | null }>("/api/auth/me");
        setLoggedIn(!!d.user);
      } catch {
        setLoggedIn(false);
      }
    })();
  }, []);

  const handleLogout = async () => {
  await api("/api/auth/logout", { method: "POST" });
  location.href = "/auth/login"; // full reload
};


  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b bg-white">
      {loggedIn ? (
        <>
          {/* Vänster sida – logga + länkar */}
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bold text-lg text-gray-900">
              BnB
            </Link>
            <Link href="/properties" className="text-sm text-gray-700 hover:text-rose-600">
              Min listning
            </Link>
            <Link href="/discover" className="text-sm text-gray-700 hover:text-rose-600">
              Boenden
            </Link>
            <Link href="/bookings" className="text-sm text-gray-700 hover:text-rose-600">
              Bokning
            </Link>
          </div>

          {/* Höger sida – logga ut */}
          <button
            onClick={handleLogout}
            className="text-sm text-rose-600 hover:underline"
          >
            Logga ut
          </button>
        </>
      ) : (
        // Om ej inloggad
        <div className="flex items-center gap-4 ml-auto">
          <Link
            href="/auth/login"
            className="text-sm font-medium text-rose-600 hover:underline"
          >
            Logga in
          </Link>
          <Link
            href="/auth/register"
            className="text-sm font-medium text-rose-600 hover:underline"
          >
            Registrera
          </Link>
        </div>
      )}
    </nav>
  );
}

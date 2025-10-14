"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Navbar() {
  const [loggedIn, setLoggedIn] = useState(false);

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
    location.href = "/auth/login";
  };

  return (
    <nav className="flex items-center gap-4 p-4 border-b">
      {loggedIn ? (
        <>
          <Link href="/" className="font-bold">BnB</Link>
          <Link href="/properties">Min listning</Link>
          <Link href="/discover">Boenden</Link>
          <Link href="/bookings">Bokning</Link>
          <span className="flex-1" />
          <button className="text-sm text-rose-600" onClick={handleLogout}>Logga ut</button>
        </>
      ) : (
        <div className="flex gap-4 ml-auto">
          <Link href="/auth/login" className="text-sm text-rose-600">Logga in</Link>
          <Link href="/auth/register" className="text-sm text-rose-600">Registrera</Link>
        </div>
      )}
    </nav>
  );
}


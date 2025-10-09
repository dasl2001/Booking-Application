"use client";
import { useEffect, useState } from "react";

export default function Nav() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    // Kolla om användaren har en aktiv token
    const token = localStorage.getItem("access_token");
    setLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    location.href = "/login";
  };

  return (
    <nav className="flex items-center gap-4 p-4 border-b">
      {/* Visa dessa endast om inloggad */}
      {loggedIn && (
        <>
          <a href="/" className="font-bold">BnB</a>
          <a href="/properties">Properties</a>
          <a href="/bookings">Bookings</a>
          <span className="flex-1" />
          <button
            className="text-sm text-rose-600"
            onClick={handleLogout}
          >
            Logga ut
          </button>
        </>
      )}

      {/* Visa detta om INTE inloggad */}
      {!loggedIn && (
        <div className="flex gap-4 ml-auto">
          <a href="/login" className="text-sm text-rose-600">Logga in</a>
          <a href="/register" className="text-sm text-rose-600">Registrera</a>
        </div>
      )}
    </nav>
  );
}


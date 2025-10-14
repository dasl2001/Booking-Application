"use client";
import { useState } from "react";
import { api } from "@/lib/api";

const clean = (s: string) =>
  s.normalize("NFKC").replace(/[\u200B-\u200D\u2060\u00A0]/g, "").trim();

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  return (
    <main className="max-w-sm mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold text-center">Logga in</h1>

      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setMsg("");
          try {
            const payload = {
              email: clean(email).toLowerCase(),
              password: clean(password),
            };
            await api("/api/auth/login", {
              method: "POST",
              body: JSON.stringify(payload),
            });
            location.href = "/"; // eller router.push("/")
          } catch (e: any) {
            setMsg(e.message || "Fel vid inloggning");
          }
        }}
      >
        <input
          className="border rounded px-3 py-2 w-full"
          type="email"
          inputMode="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="E-postadress"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="border rounded px-3 py-2 w-full"
          type="password"
          placeholder="Lösenord"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          className="px-3 py-2 rounded-full bg-rose-600 text-white w-full hover:bg-rose-700"
          type="submit"
        >
          Logga in
        </button>

        {msg && <p className="text-sm text-rose-600">{msg}</p>}
      </form>
    </main>
  );
}

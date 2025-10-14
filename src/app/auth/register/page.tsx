"use client";
import { useState } from "react";
import { api } from "@/lib/api";

const clean = (s: string) =>
  s.normalize("NFKC").replace(/[\u200B-\u200D\u2060\u00A0]/g, "").trim();

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  return (
    <main className="max-w-sm mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Skapa konto</h1>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setMsg("");
          try {
            const payload = {
              name: clean(name),
              email: clean(email).toLowerCase(),
              password: clean(password),
            };
            await api("/api/auth/register", {
              method: "POST",
              body: JSON.stringify(payload),
            });
            setMsg("Konto skapat! Kolla din e-post för verifiering och logga sedan in.");
            setName("");
            setEmail("");
            setPassword("");
          } catch (e: any) {
            setMsg(e.message || "Något gick fel");
          }
        }}
      >
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Namn"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="border rounded px-3 py-2 w-full"
          type="email"
          inputMode="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="border rounded px-3 py-2 w-full"
          type="password"
          placeholder="Lösenord (min 6 tecken)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="px-3 py-2 rounded-full bg-rose-600 text-white w-full">
          Registrera
        </button>
        {msg && <p className="text-sm text-rose-600">{msg}</p>}
      </form>
    </main>
  );
}

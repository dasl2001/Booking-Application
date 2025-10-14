"use client";
import { useEffect, useState } from "react";
import Guard from "../components/Guard";
import { api } from "@/lib/api";

type MyProperty = {
  id: string;
  name: string;
  description?: string | null;
  price_per_night: number;
  availability: boolean;
  image_url?: string | null;
};
type WithBooked = MyProperty & { is_booked?: boolean };

export default function MyPropertiesPage() {
  const [items, setItems] = useState<WithBooked[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const base = await api<{ properties: MyProperty[] }>("/api/my/properties");

        const withFlags = await Promise.all(
          base.properties.map(async (p) => {
            try {
              const r = await api<{ is_booked: boolean }>(`/api/properties/${p.id}/is-booked`);
              return { ...p, is_booked: r.is_booked };
            } catch {
              return { ...p, is_booked: false };
            }
          })
        );

        setItems(withFlags);
      } catch (e: any) {
        setMsg(e.message || "Kunde inte hämta dina boenden.");
      }
    })();
  }, []);

  return (
    <Guard>
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold">Mina listningar</h1>
        {msg && <p className="text-sm text-rose-600">{msg}</p>}

        {items.length === 0 ? (
          <p className="text-gray-500 italic">Du har inga listningar ännu.</p>
        ) : (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((p) => (
              <li key={p.id} className="border rounded-2xl p-4 bg-white shadow-sm space-y-3">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="w-full h-40 object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-100 rounded-xl grid place-items-center text-gray-400">
                    Ingen bild
                  </div>
                )}

                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-gray-900">{p.name}</h2>
                  {p.is_booked ? (
                    <span className="inline-block text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full">
                      Bokat
                    </span>
                  ) : null}
                </div>

                <div className="space-y-1 text-sm text-gray-600">
                  <p>{p.description || "Ingen beskrivning"}</p>
                  <p>
                    <span className="font-medium text-gray-900">{p.price_per_night} kr</span> / natt
                  </p>
                  <p>
                    Status:{" "}
                    <span className={p.availability ? "text-emerald-600" : "text-rose-600"}>
                      {p.availability ? "Tillgänglig" : "Ej tillgänglig"}
                    </span>
                  </p>
                </div>

                <div className="pt-2 flex gap-2">
                  <a
                    href={`/properties/${p.id}`}
                    className="text-sm px-3 py-2 rounded-full border text-gray-700 hover:bg-gray-50"
                  >
                    Visa
                  </a>
                  <a
                    href={`/bookings?property=${p.id}`}
                    className="text-sm px-3 py-2 rounded-full bg-rose-600 text-white hover:bg-rose-700"
                  >
                    Skapa bokning
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </Guard>
  );
}

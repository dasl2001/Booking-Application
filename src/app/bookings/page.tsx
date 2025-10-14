"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Guard from "../components/Guard";
import { api } from "@/lib/api";

type Prop = { id: string; name: string; price_per_night: number };
type Booking = {
  id: string;
  property_id: string;
  check_in_date: string;
  check_out_date: string;
  total_price: number;
  properties?: { name: string };
};

export default function BookingsPage() {
  const sp = useSearchParams();
  const [others, setOthers] = useState<Prop[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const o = await api<{ properties: Prop[] }>("/api/properties/others");
        setOthers(o.properties);
        const b = await api<{ bookings: Booking[] }>("/api/bookings");
        setBookings(b.bookings);
      } catch (e: any) {
        setMsg(e.message);
      }
    })();
  }, []);

  const pre = sp.get("property") || "";

  return (
    <Guard>
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold">Mina bokningar</h1>

        <form
          className="bg-white border rounded-2xl shadow-sm p-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setMsg("");
            const form = e.currentTarget;
            const f = new FormData(form);
            const property_id = String(f.get("property_id") || "");
            const check_in_date = String(f.get("check_in_date") || "");
            const check_out_date = String(f.get("check_out_date") || "");
            try {
              const d = await api<{ booking: Booking }>("/api/bookings", {
                method: "POST",
                body: JSON.stringify({ property_id, check_in_date, check_out_date }),
              });
              setBookings((prev) => [d.booking, ...prev]);
              form.reset?.();
              setMsg("✅ Bokning skapad!");
            } catch (err: any) {
              setMsg(`❌ ${err.message}`);
            }
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              name="property_id"
              defaultValue={pre}
              className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-rose-500"
              required
            >
              <option value="">Välj boende</option>
              {others.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.price_per_night} kr/natt
                </option>
              ))}
            </select>
            <input type="date" name="check_in_date" className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-rose-500" required />
            <input type="date" name="check_out_date" className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-rose-500" required />
          </div>
          <button className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-full font-semibold">
            Boka
          </button>
          {msg && (
            <p className={`text-sm ${msg.startsWith("✅") ? "text-green-600" : "text-rose-600"}`}>{msg}</p>
          )}
        </form>

        <div className="space-y-3">
          {bookings.length === 0 ? (
            <p className="text-gray-500 italic">Inga bokningar ännu.</p>
          ) : (
            bookings.map((b) => (
              <div
                key={b.id}
                className="border rounded-xl p-4 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div>
                  <div className="font-semibold text-gray-900">{b.properties?.name ?? b.property_id}</div>
                  <div className="text-sm text-gray-600">
                    {b.check_in_date} → {b.check_out_date}
                  </div>
                  <div className="text-rose-600 font-semibold mt-1">{b.total_price} kr</div>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await api(`/api/bookings/${b.id}`, { method: "DELETE" });
                      setBookings((prev) => prev.filter((x) => x.id !== b.id));
                    } catch (e: any) {
                      setMsg(`❌ ${e.message}`);
                    }
                  }}
                  className="text-sm font-medium text-rose-600 hover:text-rose-700 border border-rose-600 hover:bg-rose-50 px-4 py-2 rounded-full transition"
                >
                  Ta bort
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </Guard>
  );
}

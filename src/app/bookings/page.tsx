"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthGuard } from "../(authed)/guard";
import { api } from "@/lib/api";

type Prop = { id:string; owner_id:string; name:string; price_per_night:number; };
type Booking = { id: string; property_id: string; check_in_date: string; check_out_date: string; total_price: number; properties?: { name: string } };

export default function BookingsPage() {
  useAuthGuard();
  const sp = useSearchParams();
  const [props,setProps] = useState<Prop[]>([]);
  const [mineIds,setMineIds] = useState<string[]>([]);
  const [bookings,setBookings] = useState<Booking[]>([]);
  const [msg,setMsg] = useState("");

  useEffect(()=> {
    (async ()=>{
      try{
        const all = await fetch("/api/properties").then(r=>r.json());
        setProps(all.properties);
        const mine = await api<{properties:Prop[]}>("/api/my/properties");
        setMineIds(mine.properties.map(p=>p.id));
        const b = await api<{bookings:Booking[]}>("/api/bookings");
        setBookings(b.bookings);
      }catch(e:any){ setMsg(e.message); }
    })();
  },[]);

  const pre = sp.get("property") || "";

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">Mina bokningar</h1>

      <form className="grid md:grid-cols-2 gap-2 border rounded-2xl p-4" onSubmit={async e=>{
        e.preventDefault(); setMsg("");
        const f = new FormData(e.currentTarget as HTMLFormElement);
        const property_id = String(f.get("property_id") || "");
        const check_in_date = String(f.get("check_in_date") || "");
        const check_out_date = String(f.get("check_out_date") || "");

        if (mineIds.includes(property_id)) {
          setMsg("Du kan inte boka din egen property.");
          return;
        }

        try{
          const d = await api<{booking:Booking}>("/api/bookings", {
            method:"POST", body: JSON.stringify({ property_id, check_in_date, check_out_date })
          });
          setBookings([d.booking, ...bookings]);
          (e.currentTarget as HTMLFormElement).reset();
          setMsg("Bokning skapad!");
        }catch(e:any){ setMsg(e.message); }
      }}>
        <select name="property_id" defaultValue={pre} className="border rounded px-3 py-2 w-full" required>
          <option value="">Välj boende</option>
          {props.map(p=> <option key={p.id} value={p.id}>{p.name} — {p.price_per_night} kr/natt</option>)}
        </select>
        <input type="date" name="check_in_date" className="border rounded px-3 py-2 w-full" required />
        <input type="date" name="check_out_date" className="border rounded px-3 py-2 w-full" required />
        <button className="px-3 py-2 rounded-full bg-rose-600 text-white md:col-span-2">Boka</button>
      </form>

      <ul className="space-y-2">
        {bookings.map(b=>(
          <li key={b.id} className="border rounded-2xl p-4">
            <div><b>{b.properties?.name ?? b.property_id}</b></div>
            <div>{b.check_in_date} → {b.check_out_date}</div>
            <div className="text-rose-600 font-semibold">{b.total_price} kr</div>
          </li>
        ))}
      </ul>

      <p className="text-sm text-rose-600">{msg}</p>
    </main>
  );
}


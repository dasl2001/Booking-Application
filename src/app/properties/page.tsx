"use client";
import { useEffect, useState } from "react";
import { useAuthGuard } from "../(authed)/guard";
import { api } from "@/lib/api";

type Prop = {
  id: string; owner_id: string; name: string; description: string | null;
  location: string; price_per_night: number; availability: boolean; image_url: string | null;
};

export default function PropertiesPage() {
  useAuthGuard();
  const [mine, setMine] = useState<Prop[]>([]);
  const [all, setAll] = useState<Prop[]>([]);
  const [msg, setMsg] = useState("");

  const load = async () => {
    try {
      const m = await api<{properties:Prop[]}>("/api/my/properties");
      const a = await fetch("/api/properties").then(r=>r.json());
      setMine(m.properties); setAll(a.properties);
    } catch(e:any) { setMsg(e.message); }
  };
  useEffect(()=>{ load(); },[]);

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">Mina properties</h1>

      {/* Skapa nytt */}
      <form className="grid md:grid-cols-2 gap-2 border rounded-2xl p-4"
        onSubmit={async e=>{
          e.preventDefault(); setMsg("");
          const f = new FormData(e.currentTarget as HTMLFormElement);
          try {
            const body = {
              name: f.get("name"),
              location: f.get("location"),
              price_per_night: Number(f.get("price_per_night")),
              availability: f.get("availability")==="on",
              description: f.get("description") || null,
              image_url: f.get("image_url") || null,
            };
            const d = await api<{property:Prop}>("/api/properties",{method:"POST", body:JSON.stringify(body)});
            setMine([d.property, ...mine]);
            (e.currentTarget as HTMLFormElement).reset();
            setMsg("Property skapad!");
          } catch(e:any){ setMsg(e.message); }
        }}>
        <input name="name" className="border rounded px-3 py-2 w-full" placeholder="Namn" required />
        <input name="location" className="border rounded px-3 py-2 w-full" placeholder="Plats" required />
        <input name="price_per_night" className="border rounded px-3 py-2 w-full" type="number" step="0.01" placeholder="Pris/natt" required />
        <label className="text-sm flex items-center gap-2"><input name="availability" type="checkbox" defaultChecked /> Tillgänglig</label>
        <input name="image_url" className="border rounded px-3 py-2 w-full md:col-span-2" placeholder="Bild-URL (Storage)" />
        <textarea name="description" className="border rounded px-3 py-2 w-full md:col-span-2" placeholder="Beskrivning (valfritt)" />
        <button className="px-3 py-2 rounded-full bg-rose-600 text-white md:col-span-2">Skapa</button>
      </form>

      {/* Lista mina */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mine.map(p=>(
          <article key={p.id} className="border rounded-2xl p-4 space-y-2">
            {p.image_url && <img src={p.image_url} className="w-full h-40 object-cover rounded-xl" alt={p.name} />}
            <h3 className="text-lg font-semibold">{p.name}</h3>
            <div className="text-sm">{p.location} • {p.price_per_night} kr/natt</div>
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" defaultChecked={p.availability}
                onChange={async (e)=>{
                  const d = await api<{property:Prop}>(`/api/properties/${p.id}`,{
                    method:"PATCH", body:JSON.stringify({ availability: e.target.checked })
                  });
                  setMine(mine.map(x=> x.id===p.id? d.property : x));
                }} />
              Tillgänglig
            </label>
            <button className="px-3 py-2 rounded-full bg-rose-600 text-white"
              onClick={async ()=>{
                await api(`/api/properties/${p.id}`,{method:"DELETE"});
                setMine(mine.filter(x=> x.id!==p.id));
              }}>Ta bort</button>
          </article>
        ))}
      </div>

      <h2 className="text-xl font-bold">Alla boenden</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {all.map(p=>(
          <article key={p.id} className="border rounded-2xl p-4 space-y-2">
            {p.image_url && <img src={p.image_url} className="w-full h-40 object-cover rounded-xl" alt={p.name} />}
            <h3 className="text-lg font-semibold">{p.name}</h3>
            <div className="text-sm">{p.location} • {p.price_per_night} kr/natt</div>
            <a className="px-3 py-2 rounded-full bg-rose-600 text-white inline-block" href={`/bookings?property=${p.id}`}>Boka</a>
          </article>
        ))}
      </div>

      <p className="text-sm text-rose-600">{msg}</p>
    </main>
  );
}

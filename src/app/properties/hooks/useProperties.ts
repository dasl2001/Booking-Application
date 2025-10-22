"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export type MyProperty = {
  id: string;
  name: string;
  description?: string | null;
  location?: string | null;
  price_per_night: number | null;
  availability: boolean;
  image_url?: string | null;
};

export type WithBooked = MyProperty & { is_booked?: boolean };

// Hjälpare: säkert konvertera okänt värde till number|null
function toNullableNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function useProperties() {
  const [items, setItems] = useState<WithBooked[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<MyProperty>>({});

  const load = useCallback(async () => {
    try {
      setMsg("");
      const base = await api<{ properties: MyProperty[] }>("/api/properties/my");
      const withFlags = await Promise.all(
        (base.properties ?? []).map(async (p) => {
          try {
            const r = await api<{ is_booked: boolean }>(`/api/properties/${p.id}/is-booked`);
            return { ...p, is_booked: r.is_booked };
          } catch {
            return { ...p, is_booked: false };
          }
        })
      );
      setItems(withFlags);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Kunde inte hämta dina boenden.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createProperty(payload: {
    name: string;
    description: string | null;
    location: string | null;
    price_per_night: number | null;
    availability: boolean;
    image_url: string | null;
  }) {
    setBusy(true);
    setMsg("");
    try {
      if (!payload.name.trim()) {
        setMsg("Namn är obligatoriskt.");
        return;
      }
      if (payload.price_per_night !== null && (Number.isNaN(payload.price_per_night) || payload.price_per_night < 0)) {
        setMsg("Pris per natt måste vara ett icke-negativt tal.");
        return;
      }

      await api("/api/properties", {
        method: "POST",
        json: payload,
      });

      await load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Något gick fel vid skapande.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteProperty(id: string) {
    if (!confirm("Är du säker på att du vill ta bort denna listning?")) return;
    try {
      const prev = items;
      setItems((xs) => xs.filter((p) => p.id !== id)); // optimistiskt

      const res = await api<{ ok: true } | { error: string }>(`/api/properties/${id}`, {
        method: "DELETE",
      }).catch(async (e: unknown) => {
        // api() kastar Error vid !ok, rulla tillbaka
        setItems(prev);
        throw e;
      });

      if (!("ok" in res)) {
        // borde inte hända med vår api-helper, men skydd ifall
        setItems(prev);
        setMsg("Kunde inte ta bort boendet.");
      }
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Nätverksfel vid borttagning.");
    }
  }

  async function saveEdit() {
    if (!editId) return;

    try {
      const name = (editData.name ?? "").toString().trim();
      if (!name) {
        setMsg("Namn är obligatoriskt.");
        return;
      }

      const price = toNullableNumber(editData.price_per_night as unknown);
      if (price !== null && (Number.isNaN(price) || price < 0)) {
        setMsg("Pris per natt måste vara ett icke-negativt tal.");
        return;
      }

      const payload = {
        name,
        description: (editData.description ?? "").toString().trim() || null,
        location: (editData.location ?? "").toString().trim() || null,
        price_per_night: price,
        availability: Boolean(editData.availability),
        image_url: (editData.image_url ?? "").toString().trim() || null,
      };

      // optimistisk uppdatering
      setItems((xs) => xs.map((p) => (p.id === editId ? { ...p, ...payload } : p)));

      await api(`/api/properties/${editId}`, {
        method: "PATCH",
        json: payload,
      });

      setEditId(null);
      setEditData({});
    } catch (err: unknown) {
      // rulla tillbaka till serverns sanning
      await load();
      setMsg(err instanceof Error ? err.message : "Kunde inte spara ändringarna.");
    }
  }

  return {
    items,
    msg,
    busy,
    editId,
    editData,
    setEditId,
    setEditData,
    createProperty,
    deleteProperty,
    saveEdit,
  };
}

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
    } catch (e: any) {
      setMsg(e?.message || "Kunde inte hämta dina boenden.");
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
      if (
        payload.price_per_night !== null &&
        (Number.isNaN(payload.price_per_night) || payload.price_per_night < 0)
      ) {
        setMsg("Pris per natt måste vara ett icke-negativt tal.");
        return;
      }

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMsg(data?.error || "Kunde inte skapa boendet.");
        return;
      }

      await load();
    } catch (e: any) {
      setMsg(e?.message ?? "Något gick fel vid skapande.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteProperty(id: string) {
    if (!confirm("Är du säker på att du vill ta bort denna listning?")) return;
    try {
      const prev = items;
      setItems((xs) => xs.filter((p) => p.id !== id)); // optimistiskt

      const res = await fetch(`/api/properties/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setItems(prev);
        const data = await res.json().catch(() => ({}));
        setMsg(data?.error || "Kunde inte ta bort boendet.");
      }
    } catch (e: any) {
      setMsg(e?.message || "Nätverksfel vid borttagning.");
    }
  }

  async function saveEdit() {
    if (!editId) return;

    try {
      if (!editData.name?.trim()) {
        setMsg("Namn är obligatoriskt.");
        return;
      }
      if (
        editData.price_per_night != null &&
        (Number.isNaN(Number(editData.price_per_night)) || Number(editData.price_per_night) < 0)
      ) {
        setMsg("Pris per natt måste vara ett icke-negativt tal.");
        return;
      }

      const payload = {
        name: editData.name?.trim(),
        description: (editData.description ?? "").toString().trim() || null,
        location: (editData.location ?? "").toString().trim() || null,
        price_per_night:
          editData.price_per_night == null || editData.price_per_night === ("" as any)
            ? null
            : Number(editData.price_per_night),
        availability: Boolean(editData.availability),
        image_url: (editData.image_url ?? "").toString().trim() || null,
      };

      // optimistisk uppdatering
      setItems((xs) => xs.map((p) => (p.id === editId ? { ...p, ...payload } : p)));

      const res = await fetch(`/api/properties/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        await load(); // rulla tillbaka till serverns sanning
        const data = await res.json().catch(() => ({}));
        setMsg(data?.error || "Kunde inte spara ändringarna.");
        return;
      }

      setEditId(null);
      setEditData({});
    } catch (e: any) {
      setMsg(e?.message || "Nätverksfel vid sparande.");
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

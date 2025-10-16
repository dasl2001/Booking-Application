"use client";

import type { WithBooked } from "../hooks/useProperties";

type Props = {
  item: WithBooked;
  onEdit: () => void;
  onDelete: () => void;
};

export default function ItemCard({ item, onEdit, onDelete }: Props) {
  const p = item;

  return (
    <div className="border rounded-2xl p-4 bg-white shadow-sm space-y-3">
      {p.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.image_url} alt={p.name} className="w-full h-40 object-cover rounded-xl" />
      ) : (
        <div className="w-full h-40 bg-gray-100 rounded-xl grid place-items-center text-gray-400">
          Ingen bild
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900">{p.name}</h3>
        {p.is_booked ? (
          <span className="inline-block text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full">
            Bokat
          </span>
        ) : null}
      </div>

      <div className="space-y-1 text-sm text-gray-600">
        <p>{p.description || "Ingen beskrivning"}</p>
        <p>{p.location || "—"}</p>
        <p>
          <span className="font-medium text-gray-900">
            {p.price_per_night != null ? `${p.price_per_night} kr` : "—"}
          </span>{" "}
          / natt
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
          Status
        </a>
        <button
          onClick={onEdit}
          className="text-sm px-3 py-2 rounded-full border border-blue-300 text-blue-700 hover:bg-blue-50"
        >
          Redigera
        </button>
        <button
          onClick={onDelete}
          className="text-sm px-3 py-2 rounded-full border border-rose-300 text-rose-700 hover:bg-rose-50"
          aria-label={`Ta bort ${p.name}`}
        >
          Ta bort
        </button>
      </div>
    </div>
  );
}

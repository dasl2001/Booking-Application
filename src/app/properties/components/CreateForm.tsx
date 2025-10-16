"use client";

type Props = {
  busy?: boolean;
  onCreate: (payload: {
    name: string;
    description: string | null;
    location: string | null;
    price_per_night: number | null;
    availability: boolean;
    image_url: string | null;
  }) => Promise<void>;
};

export default function CreateForm({ busy, onCreate }: Props) {
  return (
    <form
      id="new-property-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        await onCreate({
          name: String(fd.get("name") ?? ""),
          description: String(fd.get("description") ?? "").trim() || null,
          location: String(fd.get("location") ?? "").trim() || null,
          price_per_night: fd.get("price_per_night")
            ? Number(fd.get("price_per_night"))
            : null,
          availability: true,
          image_url: String(fd.get("image_url") ?? "").trim() || null,
        });
        (document.getElementById("new-property-form") as HTMLFormElement | null)?.reset();
      }}
      className="grid gap-3 sm:grid-cols-2"
    >
      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-700">Namn *</span>
        <input name="name" required className="rounded-md border px-3 py-2" />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-700">Pris per natt (SEK)</span>
        <input name="price_per_night" inputMode="numeric" className="rounded-md border px-3 py-2" />
      </label>

      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className="text-sm text-gray-700">Plats</span>
        <input name="location" className="rounded-md border px-3 py-2" />
      </label>

      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className="text-sm text-gray-700">Beskrivning</span>
        <textarea name="description" className="rounded-md border px-3 py-2 min-h-24" />
      </label>

      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className="text-sm text-gray-700">Bild-URL</span>
        <input name="image_url" className="rounded-md border px-3 py-2" />
      </label>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md border px-4 py-2 hover:bg-gray-100 disabled:opacity-60"
        >
          {busy ? "Skapar…" : "Skapa listning"}
        </button>
      </div>
    </form>
  );
}

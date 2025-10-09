import { supa } from "@/lib/supabase";

/** Laddar upp en fil till 'property-bucket' i mappen {auth.uid()}/
 *  Returnerar publik URL som kan sparas som image_url.
 */
export async function uploadPropertyImage(file: File): Promise<string> {
  if (!file) throw new Error("Ingen fil vald");

  // skapa klient som kan läsa din auth-session (vi skickar JWT via Authorization-headern)
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const client = supa(token || undefined);

  // hämta auth-user så vi kan namnge mapp efter uid
  const { data: userData, error: userErr } = await client.auth.getUser();
  if (userErr || !userData.user) throw new Error("Du måste vara inloggad för att ladda upp bild");

  const uid = userData.user.id;
  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${crypto.randomUUID()}.${ext}`;
  const path = `${uid}/${filename}`; // matchar policyn {auth.uid()}/*

  const { error: uploadErr } = await client
    .storage
    .from("property-bucket")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg",
    });

  if (uploadErr) throw new Error(uploadErr.message);

  // Bygg publik URL (bucket är public)
  const publicUrl = client
    .storage
    .from("property-bucket")
    .getPublicUrl(path).data.publicUrl;

  return publicUrl;
}

// app/auth/login/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = false; // 👈 måste vara false eller ett nummer, inte 0 i klientfil

import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Laddar inloggning...</div>}>
      <LoginClient />
    </Suspense>
  );
}

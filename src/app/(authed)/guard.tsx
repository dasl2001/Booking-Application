"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useAuthGuard() {
  const router = useRouter();
  useEffect(() => {
    const t = localStorage.getItem("access_token");
    if (!t) router.replace("/login");
  }, [router]);
}

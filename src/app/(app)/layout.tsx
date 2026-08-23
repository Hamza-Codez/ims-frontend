"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useSession } from "@/features/auth/session";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, setupRequired } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (setupRequired) {
        router.replace("/setup");
      } else if (!user) {
        router.replace("/login");
      }
    }
  }, [loading, user, setupRequired, router]);

  // Frontend guarding is UX only (AZ-3) — every request is still authorized server-side.
  if (loading) return <div className="flex min-h-screen items-center justify-center p-6 text-sm text-text-secondary">Loading...</div>;
  if (!user) return null;

  return <AppShell>{children}</AppShell>;
}

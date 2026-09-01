"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Layers } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/features/auth/session";
import { Button } from "@/components/Button";
import { Field, Input } from "@/components/Input";
import type { UserOut } from "@/types/api";

export default function SetupPage() {
  const router = useRouter();
  const { refresh, setupRequired, loading } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !setupRequired) {
      router.replace("/");
    }
  }, [loading, setupRequired, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post<UserOut>("/auth/setup", { email, password });
      await refresh();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not complete setup.");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !setupRequired) {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full bg-bg relative lg:justify-end overflow-hidden">
      {/* Full screen background image with coloured blur overlay */}
      <div 
        className="absolute inset-0 hidden lg:block bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/assets/signin.png')" }}
      >
        <div className="absolute inset-0 bg-ink/30 backdrop-blur-[0.5px]" />
      </div>

      {/* Horizontal bar spanning full screen width */}
      <div className="absolute top-8 left-0 right-0 z-20 hidden lg:flex h-[72px] items-center px-12 bg-chrome shadow-xl">
        <div className="flex items-center gap-3">
          <img src="/assets/brand_logo.png" alt="Brand Logo" className="h-10 object-contain" />
        </div>
      </div>

      {/* Right side: Vertical bar for setup form (30%) */}
      <div className="flex w-full lg:w-[30%] min-w-[320px] max-w-[500px] flex-col justify-center bg-accent-hover px-8 py-12 lg:px-12 shadow-2xl z-30 border-l border-accent lg:mr-16">
        <form onSubmit={submit} className="w-full max-w-sm mx-auto flex flex-col gap-5 [&_.eyebrow]:!text-ink/90">
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-8 lg:hidden">
              <img src="/assets/brand_logo.png" alt="Brand Logo" className="h-8 object-contain" />
            </div>
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-ink">Welcome to Stock Engine</h1>
            <p className="mt-1 text-sm text-ink/90">This is a fresh installation. Create your initial administrator account to get started.</p>
          </div>

          <Field label="Admin Email">
            <Input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="!bg-bg !text-ink !border-ink/60 placeholder:!text-ink/65 focus:!ring-ink"
              required
            />
          </Field>
          
          <Field label="Admin Password" hint="At least 12 characters.">
            <Input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="!bg-bg !text-ink !border-ink/60 placeholder:!text-ink/65 focus:!ring-ink"
              required
            />
          </Field>

          {error ? (
            <p className="border-l-2 border-ink bg-accent px-3 py-2 text-sm text-ink">{error}</p>
          ) : null}

          <Button 
            type="submit" 
            variant="primary" 
            disabled={busy} 
            className="w-full justify-center mt-2 h-10 text-[15px] !bg-ink !text-bg !border-ink hover:opacity-90"
          >
            {busy ? "Setting up..." : "Complete Setup"}
          </Button>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/features/auth/session";
import { Button } from "@/components/Button";
import { Field, Input } from "@/components/Input";
import type { UserOut } from "@/types/api";

export default function LoginPage() {
  const router = useRouter();
  const { refresh, setupRequired } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (setupRequired) {
      router.replace("/setup");
    }
  }, [setupRequired, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post<UserOut>("/auth/login", { email, password });
      await refresh();
      router.push("/dashboard");
    } catch (err) {
      // AZ-4: a 401 here is a credential failure, never a role problem.
      setError(err instanceof ApiError ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
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
          <img src="/assets/brand_logo.jpg" alt="Brand Logo" className="h-10 object-contain" />
          <span className="text-xl font-bold tracking-tight text-on-chrome uppercase">Stock Engine</span>
        </div>
      </div>

      {/* Right side: Vertical bar for signin form (30%) */}
      <div className="flex w-full lg:w-[30%] min-w-[320px] max-w-[500px] flex-col justify-center bg-accent-hover px-8 py-12 lg:px-12 shadow-2xl z-30 border-l border-accent lg:mr-16">
        <form onSubmit={submit} className="w-full max-w-sm mx-auto flex flex-col gap-5 [&_.eyebrow]:!text-ink/90">
          <div className="mb-2">
            {/* Mobile logo fallback */}
            <div className="flex items-center gap-2 mb-8 lg:hidden">
              <img src="/assets/brand_logo.jpg" alt="Brand Logo" className="h-8 object-contain" />
              <span className="text-lg font-bold tracking-tight text-ink uppercase">Stock Engine</span>
            </div>
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-ink">Sign in</h1>
            <p className="mt-1 text-sm text-ink/90">Access the operations console.</p>
          </div>

          <Field label="Email">
            <Input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="!bg-bg !text-ink !border-ink/60 placeholder:!text-ink/65 focus:!ring-ink"
              required
            />
          </Field>
          
          <Field label="Password">
            <Input
              type="password"
              autoComplete="current-password"
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
            {busy ? "Signing in..." : "Sign in"}
          </Button>

          <p className="text-sm text-ink/90">
            No account?{" "}
            <Link href="/register" className="font-medium text-ink underline underline-offset-2">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

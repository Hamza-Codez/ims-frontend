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

export default function RegisterPage() {
  const router = useRouter();
  const { refresh, setupRequired } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
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
      await api.post<UserOut>("/auth/register", { email, password, invite_code: inviteCode });
      await api.post<UserOut>("/auth/login", { email, password });
      await refresh();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-bg relative lg:justify-end overflow-hidden">
      <div
        className="absolute inset-0 hidden lg:block bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/assets/signin.png')" }}
      >
        <div className="absolute inset-0 bg-ink/30 backdrop-blur-[0.5px]" />
      </div>

      <div className="absolute top-8 left-0 right-0 z-20 hidden lg:flex h-[72px] items-center px-12 bg-chrome shadow-xl">
        <div className="flex items-center gap-3">
          <Layers size={28} className="text-accent" />
          <span className="text-xl font-bold tracking-tight text-on-chrome uppercase">Stock Engine</span>
        </div>
      </div>

      <div className="flex w-full lg:w-[30%] min-w-[320px] max-w-[500px] flex-col justify-center bg-accent-hover px-8 py-12 lg:px-12 shadow-2xl z-30 border-l border-accent lg:mr-16">
        <form
          onSubmit={submit}
          className="w-full max-w-sm mx-auto flex flex-col gap-5 [&_.eyebrow]:!text-ink/90"
        >
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-8 lg:hidden">
              <Layers size={24} className="text-ink" />
              <span className="text-lg font-bold tracking-tight text-ink uppercase">Stock Engine</span>
            </div>
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-ink">
              Create an account
            </h1>
            <p className="mt-1 text-sm text-ink/90">
              You must have a 14-character invite code from an administrator to register.
            </p>
          </div>

          <Field label="Invite Code" hint="Format: XXXX-XXXX-XXXX">
            <Input
              type="text"
              autoComplete="off"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="!bg-bg !text-ink !border-ink/60 placeholder:!text-ink/65 focus:!ring-ink"
              placeholder="ABCD-1234-WXYZ"
              required
            />
          </Field>

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

          <Field label="Password" hint="At least 12 characters.">
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
            {busy ? "Creating account..." : "Create account"}
          </Button>

          <p className="text-sm text-ink/90">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-ink underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

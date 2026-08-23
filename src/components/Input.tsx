"use client";

/** UIUX.md §6 — white, hairline border, 2px radius, amber focus ring; label above in eyebrow style. */
import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="eyebrow">{label}</span>
      {children}
      {hint ? <span className="text-xs text-text-secondary">{hint}</span> : null}
    </label>
  );
}

const CONTROL =
  "h-9 w-full rounded-xs border border-hairline bg-bg px-2.5 text-sm text-ink placeholder:text-text-muted";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function Input({ className = "", mono, type, ...rest }: InputHTMLAttributes<HTMLInputElement> & { mono?: boolean }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  if (isPassword) {
    return (
      <div className="relative w-full">
        <input
          {...rest}
          type={showPassword ? "text" : "password"}
          className={[CONTROL, mono ? "data" : "", className, "pr-10"].join(" ")}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-text-muted hover:text-ink focus:outline-none"
          tabIndex={-1}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    );
  }

  return <input {...rest} type={type} className={[CONTROL, mono ? "data" : "", className].join(" ")} />;
}
export function Select({ className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={[CONTROL, className].join(" ")}>
      {children}
    </select>
  );
}

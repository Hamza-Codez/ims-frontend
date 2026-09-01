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

import React, { useState, useRef, useEffect } from "react";
import { Eye, EyeOff, ChevronDown } from "lucide-react";

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
export function Select({ className = "", children, value, onChange, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options: { value: string, label: ReactNode }[] = [];
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === "option") {
      const props = child.props as React.OptionHTMLAttributes<HTMLOptionElement>;
      options.push({
        value: (props.value as string) || "",
        label: props.children as ReactNode,
      });
    }
  });

  const selectedOption = options.find((o) => o.value === value) || options[0];

  const triggerChange = (newValue: string) => {
    if (onChange) {
      onChange({ target: { value: newValue } } as any);
    }
    setOpen(false);
  };

  return (
    <div className="relative w-full" ref={ref}>
      <select value={value} onChange={onChange} className="hidden" {...rest}>
        {children}
      </select>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={[CONTROL, "flex items-center justify-between text-left", className].join(" ")}
      >
        <span className="truncate">{selectedOption?.label || "Select..."}</span>
        <ChevronDown size={16} className="text-text-muted shrink-0 ml-2" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xs border border-hairline bg-bg shadow-dropdown">
          {options.map((opt, idx) => (
            <div
              key={idx}
              className={`cursor-pointer px-2.5 py-2 text-sm ${
                opt.value === value ? "bg-accent text-ink font-medium" : "text-ink hover:bg-accent hover:text-ink"
              }`}
              onClick={() => triggerChange(opt.value)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

/** UIUX.md §6 — centered, white, hairline border + modal shadow, 2px radius.
 *  Used for create forms and EVERY destructive confirm. Actions right-aligned in the footer. */
import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-xs border border-hairline bg-bg"
        style={{ boxShadow: "0 8px 24px rgba(0,0,0,.12)" }}
      >
        <header className="flex items-center justify-between bg-ink px-4 py-3">
          <h2 className="text-[18px] font-semibold leading-tight text-white">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-white hover:opacity-80 transition-opacity">
            <X size={18} strokeWidth={1.75} />
          </button>
        </header>
        <div className="flex flex-col gap-4 px-4 py-4">{children}</div>
        {footer ? (
          <footer className="flex justify-end gap-2 border-t border-hairline px-4 py-3">{footer}</footer>
        ) : null}
      </div>
    </div>
  );
}

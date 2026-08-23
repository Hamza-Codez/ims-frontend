/** UIUX.md §6 — 36px tall, 2px radius, no pills. Primary is an INK fill with cream (`bg`) text;
 *  secondary is the ink outline; ghost is bare until hover. */
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant =
  | "primary" | "secondary" | "ghost" | "destructive" | "danger" | "inbound" | "outbound";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-bg hover:opacity-90 border border-ink",
  // Outline, not a second ink fill: a secondary sitting next to a primary must not look identical
  // (every modal pairs Cancel with a confirm action).
  secondary: "bg-transparent text-ink hover:bg-surface-subtle border border-ink",
  ghost: "bg-transparent text-ink hover:bg-ink hover:text-bg border border-ink",
  // §6: destructive rests as an ink fill and commits to `danger` on hover. ALWAYS behind a
  // confirmation modal.
  destructive: "bg-ink text-white border border-ink hover:bg-danger hover:border-danger",
  // Row-level destructive action (Cancel order / Remove): quiet until you reach for it.
  danger:
    "bg-transparent text-ink border border-ink hover:bg-danger hover:text-white hover:border-danger",
  // §2 direction tokens — the only two buttons that carry a direction colour.
  inbound: "bg-inbound text-bg border border-inbound hover:opacity-90",
  outbound: "bg-outbound text-bg border border-outbound hover:opacity-90",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({ variant = "secondary", className = "", children, ...rest }: Props) {
  const isDestructiveText = typeof children === "string" && ["Cancel", "Remove"].includes(children.trim());

  return (
    <button
      {...rest}
      className={[
        "inline-flex h-8 items-center gap-2 rounded-xs px-2.5 text-sm font-medium whitespace-nowrap",
        "transition-colors duration-150 ease-out",
        "disabled:cursor-not-allowed disabled:opacity-40",
        VARIANTS[variant],
        isDestructiveText ? "hover:!bg-danger hover:!text-white hover:!border-danger" : "",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

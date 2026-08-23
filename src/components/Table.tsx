/** UIUX.md §6 — the workhorse. Sticky header on surface-header (a visible band) with eyebrow labels, 1px row
 *  rules, hover surface-subtle, numeric columns mono + tabular + right-aligned. Every table has
 *  an empty state and a flat (no shimmer) loading state. */
import type { ReactNode } from "react";

export function TableShell({ children }: { children: ReactNode }) {
  // Tables go full width and scroll horizontally on mobile rather than dropping numeric columns.
  return (
    <div className="w-full overflow-x-auto border border-hairline">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, numeric }: { children: ReactNode; numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={[
        "sticky top-0 z-10 whitespace-nowrap border-b border-black/10 bg-accent px-6 py-3",
        "eyebrow !text-ink text-left",
      ].join(" ")}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  numeric,
  mono,
  className = "",
}: {
  children: ReactNode;
  numeric?: boolean;
  mono?: boolean;
  className?: string;
}) {
  return (
    <td
      className={[
        "border-b border-hairline px-6 align-middle text-left",
        mono || numeric ? "data" : "",
        className,
      ].join(" ")}
      style={{ height: 44 }}
    >
      {children}
    </td>
  );
}

export function Tr({ children }: { children: ReactNode }) {
  return <tr className="transition-colors duration-150 ease-out hover:bg-accent-wash">{children}</tr>;
}

/** Text-forward and actionable, in the interface's voice — never a vague shrug (§6). */
export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 border border-hairline px-4 py-10">
      <p className="text-sm text-text-secondary">{message}</p>
      {action}
    </div>
  );
}

/** Flat skeleton rows, no shimmer (§6). */
export function SkeletonRows({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="border border-hairline">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-hairline px-3" style={{ height: 44 }}>
          {Array.from({ length: cols }).map((__, c) => (
            <div key={c} className="my-auto h-3 flex-1 bg-surface-subtle" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Fetch wrapper for the backend.
 *
 * Two things the backend requires (AUTHENTICATION.md):
 *  - `credentials: "include"` so the httpOnly session cookie travels;
 *  - the double-submit CSRF token echoed from the `csrf_token` cookie into `X-CSRF-Token`
 *    on every unsafe method. Safe methods must not send it.
 *
 * Validation is NOT done here. The backend is authoritative (AZ-3); this layer only surfaces
 * the error envelope it returns.
 */

import type { ErrorEnvelope } from "@/types/api";

/**
 * Same-origin by default (AUTHENTICATION.md §Same-origin deployment). `/api` is rewritten to the
 * real API host by next.config.ts, so the browser never sees a second origin: no cross-domain
 * password post, no `SameSite=None`, no preflight.
 *
 * NEXT_PUBLIC_API_BASE_URL remains an escape hatch for pointing a build straight at an API host,
 * but note that doing so re-introduces the cross-origin setup this replaced.
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** The CSRF cookie is deliberately readable by JS — that is how double-submit works. */
function csrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const hit = document.cookie
    .split("; ")
    .find((c) => c.startsWith("csrf_token="));
  return hit ? decodeURIComponent(hit.slice("csrf_token=".length)) : null;
}

/** An API error carrying the machine code, so callers can branch on OVERSELL etc. */
export class ApiError extends Error {
  readonly status: number;
  readonly envelope: ErrorEnvelope | null;

  constructor(status: number, envelope: ErrorEnvelope | null, fallback: string) {
    super(envelope?.message ?? fallback);
    this.name = "ApiError";
    this.status = status;
    this.envelope = envelope;
  }

  get code(): string | undefined {
    return this.envelope?.code;
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (UNSAFE.has(method)) {
    const token = csrfToken();
    if (token) headers.set("X-CSRF-Token", token);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    method,
    headers,
    credentials: "include",
  });

  if (response.status === 204) return undefined as T;

  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  // An expired or revoked session should send the user to sign in, not surface as a toast on
  // whatever button they happened to press. Auth pages are excluded so this cannot loop.
  if (response.status === 401 && typeof window !== "undefined") {
    const onAuthPage = ["/login", "/register", "/setup"].some((p) =>
      window.location.pathname.startsWith(p),
    );
    if (!onAuthPage) window.location.assign("/login");
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      (payload as ErrorEnvelope) ?? null,
      `Request failed (${response.status})`,
    );
  }
  return payload as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  put: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};

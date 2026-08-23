import type { NextConfig } from "next";

/**
 * The browser must only ever see ONE origin (AUTHENTICATION.md §Same-origin deployment).
 *
 * Every API call goes to `/api/*` on this domain and is rewritten server-side to the API host.
 * A login form that posts a password to a different registrable domain is the signature of
 * credential phishing — Chrome's password protection flagged this deployment for exactly that.
 * Proxying also means the session cookie is same-site (no `SameSite=None`) and CORS stops being
 * load-bearing for the browser.
 *
 * `API_ORIGIN` is server-side only: it is read at request time by the rewrite, never shipped to
 * the client, and so is NOT a `NEXT_PUBLIC_` variable.
 */
const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_ORIGIN}/:path*`,
      },
    ];
  },
};

export default nextConfig;

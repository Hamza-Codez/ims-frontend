/**
 * Ensures an admin exists before the journey runs, without touching the database directly.
 *
 * Uses only the two public provisioning endpoints (AUTHENTICATION.md AP-7):
 *   - a pristine database  -> POST /auth/setup creates the first INVENTORY_ADMIN
 *   - an already-set-up one -> we must be able to sign in as the known admin
 *
 * If neither holds, it fails loudly with the reset command rather than letting the journey fail
 * later with a confusing "cannot sign in".
 */
import { request } from "@playwright/test";

export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@example.com",
  password: process.env.E2E_ADMIN_PASSWORD ?? "e2e-password-123",
};

const API = process.env.E2E_API_URL ?? "http://localhost:8000";

const RESET_HINT = `
  The API has users, but '${ADMIN.email}' cannot sign in.
  Reset the auth tables and re-run:

    docker compose exec -T db psql -U ims -d ims -c \\
      "DELETE FROM session; DELETE FROM invite_code; DELETE FROM app_user;"
`;

export default async function globalSetup() {
  const api = await request.newContext({ baseURL: API });

  const health = await api.get("/health").catch(() => null);
  if (!health || !health.ok()) {
    throw new Error(
      `The API is not reachable at ${API}. Start it with \`docker compose up -d\` from the repo root.`,
    );
  }

  const status = await api.get("/auth/setup-status");
  const { setup_required: setupRequired } = await status.json();

  if (setupRequired) {
    const created = await api.post("/auth/setup", { data: ADMIN });
    if (!created.ok()) {
      throw new Error(`First-run setup failed: ${created.status()} ${await created.text()}`);
    }
    console.log(`  e2e: created first admin ${ADMIN.email}`);
  } else {
    const login = await api.post("/auth/login", { data: ADMIN });
    if (!login.ok()) throw new Error(RESET_HINT);
    console.log(`  e2e: signed in as existing admin ${ADMIN.email}`);
  }

  await api.dispose();
}

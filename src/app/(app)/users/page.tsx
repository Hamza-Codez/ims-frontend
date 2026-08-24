"use client";

import { useEffect, useState } from "react";
import { Plus, CircleUser, KeyRound, Key } from "lucide-react";
import { api } from "@/lib/api";
import { useSubmit } from "@/lib/useSubmit";
import { roleLabel } from "@/lib/labels";
import { toastDone, toastApiError } from "@/lib/toast";
import { Button } from "@/components/Button";
import { Field, Input, Select } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { TableShell, Th, Td, Tr, EmptyState, SkeletonRows } from "@/components/Table";
import { CAN, allowed, useSession } from "@/features/auth/session";
import type { Role, UserOut, InviteCodeOut, PaginatedResponse } from "@/types/api";
import { Pagination } from "@/components/Pagination";
import { SearchBar } from "@/components/SearchBar";
import { useSearchParams } from "next/navigation";

const ROLES: Role[] = ["STOCK_CLERK", "PURCHASING_MANAGER", "INVENTORY_ADMIN", "VIEWER"];
const BLANK = { email: "", password: "", role: "" as Role | "" };

export default function UsersPage() {
  const { user: me } = useSession();
  // AZ-3: UX only. Every one of these calls is guarded to INVENTORY_ADMIN server-side regardless.
  const canManage = allowed(me?.role, CAN.userAdmin);

  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1');
  const searchQuery = searchParams.get('search') || '';

  const [data, setData] = useState<PaginatedResponse<UserOut> | null>(null);
  const [invites, setInvites] = useState<InviteCodeOut[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [inviteRole, setInviteRole] = useState<Role>("VIEWER");
  const [form, setForm] = useState(BLANK);
  const [resetting, setResetting] = useState<UserOut | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [deactivating, setDeactivating] = useState<UserOut | null>(null);
  // Ref-backed guards — a plain `useState` flag is read from a stale closure, so a burst of
  // clicks all saw `false` and all fired. See lib/useSubmit.ts. One guard per form, so
  // generating an invite cannot disable the add-user button.
  const createGuard = useSubmit();
  const inviteGuard = useSubmit();
  const passwordGuard = useSubmit();
  const [busyRowId, setBusyRowId] = useState<number | null>(null);

  async function load() {
    try {
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      if (searchQuery) params.set('search', searchQuery);

      const [usersData, invitesData] = await Promise.all([
        api.get<PaginatedResponse<UserOut>>(`/users?${params.toString()}`),
        canManage ? api.get<InviteCodeOut[]>("/users/invites/all") : Promise.resolve([]),
      ]);
      setData(usersData);
      if (canManage) {
        setInvites(invitesData);
      }
    } catch (e) {
      toastApiError(e, "Could not load data.");
      setData(null);
      setInvites([]);
    }
  }
  useEffect(() => {
    void load();
  }, [canManage, currentPage, searchQuery]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await createGuard.run(async () => {
      try {
        await api.post("/users", {
          email: form.email,
          password: form.password,
          role: form.role,
        });
        toastDone("User added");
        setCreating(false);
        setForm(BLANK);
        await load();
      } catch (e) {
        toastApiError(e);
      }
    });
  }

  async function createInvite(e: React.FormEvent) {
    e.preventDefault();
    // Each click here mints a real, usable invite key. Unguarded, three clicks handed out three
    // credentials where the admin meant to hand out one.
    await inviteGuard.run(async () => {
      try {
        await api.post("/users/invites", { role: inviteRole });
        toastDone("Invite key generated");
        setCreatingInvite(false);
        setInviteRole("VIEWER");
        await load();
      } catch (e) {
        toastApiError(e);
      }
    });
  }

  async function revokeInvite(id: string) {
    try {
      await api.del("/users/invites/" + id);
      toastDone("Invite key revoked");
      await load();
    } catch (e) {
      toastApiError(e);
    }
  }

  async function changeRole(u: UserOut, role: Role) {
    if (busyRowId !== null) return;
    setBusyRowId(u.id);
    try {
      await api.patch("/users/" + u.id, { role });
      toastDone("Role updated");
      await load();
    } catch (e) {
      // 409 LAST_ADMIN if this would leave nobody able to administer the system.
      toastApiError(e);
    } finally {
      setBusyRowId(null);
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetting) return;
    await passwordGuard.run(async () => {
      try {
        // AP-3: the response never echoes the password back.
        await api.post("/users/" + resetting.id + "/password", { password: newPassword });
        toastDone("Password reset");
        setResetting(null);
        setNewPassword("");
      } catch (e) {
        toastApiError(e);
      }
    });
  }

  async function deactivate() {
    if (!deactivating) return;
    try {
      // AP-2: deactivation, never deletion — users are referenced by created_by forever.
      await api.del("/users/" + deactivating.id);
      toastDone("User deactivated");
      setDeactivating(null);
      await load();
    } catch (e) {
      toastApiError(e);
    }
  }

  async function reactivate(u: UserOut) {
    if (busyRowId !== null) return;
    setBusyRowId(u.id);
    try {
      await api.patch("/users/" + u.id, { is_active: true });
      toastDone("User reactivated");
      await load();
    } catch (e) {
      toastApiError(e);
    } finally {
      setBusyRowId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-semibold leading-tight">Users</h2>
        {canManage ? (
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus size={18} strokeWidth={1.75} /> Add user
          </Button>
        ) : null}
      </div>

      <p className="text-sm text-text-secondary">
        Accounts come from here or from a single-use invite code — never from an uninvited
        sign-up. Deactivation keeps the account so past orders keep their author.
      </p>

      <div className="flex items-center justify-between mt-2 mb-2">
        <SearchBar placeholder="Search by email..." />
      </div>

      {!data ? (
        <SkeletonRows cols={4} />
      ) : data.items.length === 0 ? (
        <EmptyState message="No users found." />
      ) : (
        <>
          <TableShell>
            <thead>
              <tr>
                <Th numeric>ID</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>&nbsp;</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => {
                const isMe = u.id === me?.id;
                return (
                  <Tr key={u.id}>
                    <Td numeric>{u.id}</Td>
                    <Td mono>
                      <span className="inline-flex items-center gap-1.5">
                        <CircleUser size={16} strokeWidth={1.75} aria-hidden />
                        {u.email}
                        {isMe ? <span className="eyebrow">you</span> : null}
                      </span>
                    </Td>
                    <Td>
                      {canManage && u.is_active ? (
                        <Select
                          value={u.role}
                          onChange={(e) => changeRole(u, e.target.value as Role)}
                          aria-label={"Role for " + u.email}
                          className="h-8"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {roleLabel(r)}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        roleLabel(u.role)
                      )}
                    </Td>
                    <Td>
                      {u.is_active ? (
                        <span className="text-sm">Active</span>
                      ) : (
                        <span className="text-sm text-text-muted line-through">Deactivated</span>
                      )}
                    </Td>
                    <Td className="text-right">
                      {canManage ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setResetting(u);
                              setNewPassword("");
                            }}
                          >
                            <KeyRound size={18} strokeWidth={1.75} /> Reset password
                          </Button>
                          {u.is_active ? (
                            <Button variant="danger" onClick={() => setDeactivating(u)}>
                              Deactivate
                            </Button>
                          ) : (
                            <Button variant="secondary" onClick={() => reactivate(u)}>
                              Reactivate
                            </Button>
                          )}
                        </div>
                      ) : null}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </TableShell>
          <Pagination total={data.total} page={data.page} pages={data.pages} />
        </>
      )}

      {canManage ? (
        <>
          <div className="mt-8 flex items-center justify-between">
            <h2 className="text-[18px] font-semibold leading-tight">Active Invite Codes</h2>
            <Button variant="secondary" onClick={() => setCreatingInvite(true)}>
              <Key size={18} strokeWidth={1.75} /> Generate Invite Key
            </Button>
          </div>
          <p className="text-sm text-text-secondary">
            These one-time keys allow users to self-register. Share a key with a new user. 
            Once used, the key is consumed and can no longer be used.
          </p>
          {!invites ? (
            <SkeletonRows cols={3} />
          ) : invites.length === 0 ? (
            <EmptyState message="No active invite keys." />
          ) : (
            <TableShell>
              <thead>
                <tr>
                  <Th>Invite Key</Th>
                  <Th>Role to Assign</Th>
                  <Th>&nbsp;</Th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <Tr key={inv.id}>
                    <Td mono className="font-bold tracking-wider">{inv.code}</Td>
                    <Td>{roleLabel(inv.role)}</Td>
                    <Td className="text-right">
                      <Button variant="danger" onClick={() => revokeInvite(inv.id)}>
                        Revoke
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </>
      ) : null}

      <Modal
        open={creating}
        title="Add user"
        onClose={() => setCreating(false)}
        footer={
          <>
            <Button onClick={() => setCreating(false)} disabled={createGuard.busy}>Cancel</Button>
            <Button variant="primary" form="user-form" type="submit" disabled={createGuard.busy}>
              {createGuard.busy ? "Adding..." : "Add user"}
            </Button>
          </>
        }
      >
        <form id="user-form" onSubmit={create} className="flex flex-col gap-4">
          <Field label="Email" hint="Immutable once created.">
            <Input
              type="email"
              autoComplete="off"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </Field>
          <Field label="Password" hint="At least 12 characters. Shared with them; never shown again.">
            <Input
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </Field>
          <Field label="Role">
            <Select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              required
            >
              <option value="">Select a role</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </Select>
          </Field>
        </form>
      </Modal>

      <Modal
        open={creatingInvite}
        title="Generate Invite Key"
        onClose={() => setCreatingInvite(false)}
        footer={
          <>
            <Button onClick={() => setCreatingInvite(false)} disabled={inviteGuard.busy}>Cancel</Button>
            <Button variant="primary" form="invite-form" type="submit" disabled={inviteGuard.busy}>
              {inviteGuard.busy ? "Generating..." : "Generate Key"}
            </Button>
          </>
        }
      >
        <form id="invite-form" onSubmit={createInvite} className="flex flex-col gap-4">
          <p className="text-sm">
            This will generate a secure 14-character key that a user can enter during registration. 
            Once they register, they will be assigned the selected role, and the key will become invalid.
          </p>
          <Field label="Role to Assign">
            <Select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Role)}
              required
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </Select>
          </Field>
        </form>
      </Modal>

      <Modal
        open={!!resetting}
        title={"Reset password — " + (resetting?.email ?? "")}
        onClose={() => setResetting(null)}
        footer={
          <>
            <Button onClick={() => setResetting(null)} disabled={passwordGuard.busy}>Cancel</Button>
            <Button variant="primary" form="pw-form" type="submit" disabled={passwordGuard.busy}>
              {passwordGuard.busy ? "Resetting..." : "Reset password"}
            </Button>
          </>
        }
      >
        <form id="pw-form" onSubmit={resetPassword} className="flex flex-col gap-4">
          <Field label="New password" hint="At least 12 characters.">
            <Input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </Field>
          <p className="text-xs text-text-secondary">
            Their existing sessions are unaffected until they expire.
          </p>
        </form>
      </Modal>

      <Modal
        open={!!deactivating}
        title="Deactivate user"
        onClose={() => setDeactivating(null)}
        footer={
          <>
            <Button onClick={() => setDeactivating(null)}>Keep active</Button>
            <Button variant="destructive" onClick={deactivate}>
              Deactivate
            </Button>
          </>
        }
      >
        <p className="text-sm">
          Deactivate <span className="data">{deactivating?.email}</span>? They are signed out
          immediately and cannot sign in again. The account is kept, not deleted, so their past
          orders and movements keep their author.
        </p>
      </Modal>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Badge, Button, Panel } from "@nodex/ui";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000/api/v1";

type AdminUser = {
  id: string;
  displayName: string | null;
  username: string | null;
  telegramUserId?: string | null;
  phone: string | null;
  status: string;
  roles: string[];
  sessionsCount: number;
  lastSeenAt: string | null;
};

export function UsersPanel() {
  const [accessToken, setAccessToken] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("Admin session required");

  async function request(path: string, init: RequestInit = {}) {
    const response = await fetch(`${apiBase}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "content-type": "application/json",
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        ...init.headers,
      },
    });
    if (!response.ok) throw new Error("request_failed");
    return response.json();
  }

  async function login() {
    const body = await request("/auth/mock", {
      method: "POST",
      body: JSON.stringify({ appContext: "ADMIN_WEB" }),
    });
    setAccessToken(body.accessToken);
    setStatus(`Signed in as ${body.user.displayName ?? "admin"}`);
  }

  async function loadUsers() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (role) params.set("role", role);
    const body = await request(`/admin/users?${params.toString()}`);
    setUsers(body.users);
    setSelected(body.users[0] ?? null);
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1.6fr_0.9fr]">
      <Panel className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-56 flex-1 text-sm">
            <span className="text-slate-500">Search</span>
            <input
              className="mt-1 h-10 w-full rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3"
              value={q}
              onChange={(event) => setQ(event.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="text-slate-500">Role</span>
            <select
              className="mt-1 h-10 rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="">All</option>
              <option value="CLIENT">CLIENT</option>
              <option value="DRIVER">DRIVER</option>
              <option value="ADMIN">ADMIN</option>
              <option value="SUPPORT">SUPPORT</option>
            </select>
          </label>
          <Button onClick={login} variant="secondary">
            Admin mock login
          </Button>
          <Button onClick={loadUsers}>Load users</Button>
        </div>
        <Badge tone="info">{status}</Badge>
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[rgb(var(--border))]">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-[rgb(var(--surface-muted))]">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Roles</th>
                <th className="p-3">Status</th>
                <th className="p-3">Sessions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="cursor-pointer border-t border-[rgb(var(--border))]"
                  onClick={() => setSelected(user)}
                >
                  <td className="p-3">
                    <div className="font-semibold">
                      {user.displayName ?? user.username ?? user.id}
                    </div>
                    <div className="text-xs text-slate-500">
                      {user.telegramUserId ?? "no telegram id"}
                    </div>
                  </td>
                  <td className="p-3">{user.roles.join(", ")}</td>
                  <td className="p-3">{user.status}</td>
                  <td className="p-3">{user.sessionsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel>
        <div className="text-sm text-slate-500">User detail</div>
        {selected ? (
          <div className="mt-3 space-y-2 text-sm">
            <div className="text-lg font-bold">{selected.displayName ?? selected.id}</div>
            <div>Telegram: {selected.telegramUserId ?? "none"}</div>
            <div>Username: {selected.username ?? "none"}</div>
            <div>Phone: {selected.phone ?? "none"}</div>
            <div>Roles: {selected.roles.join(", ")}</div>
            <div>Last seen: {selected.lastSeenAt ?? "never"}</div>
          </div>
        ) : (
          <div className="mt-3 text-sm text-slate-500">No user selected</div>
        )}
      </Panel>
    </section>
  );
}

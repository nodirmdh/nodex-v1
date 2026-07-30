"use client";

import { useState } from "react";
import { Badge, Button, Panel } from "@nodex/ui";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000/api/v1";

type DriverUser = {
  displayName: string | null;
  locale: string;
  theme: string;
  driverProfile?: {
    city?: string | null;
    bio?: string | null;
    onboardingStatus?: string;
    verificationStatus?: string;
  } | null;
};

export function DriverAuthPanel() {
  const [accessToken, setAccessToken] = useState("");
  const [user, setUser] = useState<DriverUser | null>(null);
  const [status, setStatus] = useState("Идёт вход");
  const [form, setForm] = useState({ displayName: "", city: "", bio: "" });

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

  async function mockLogin() {
    try {
      const body = await request("/auth/mock", {
        method: "POST",
        body: JSON.stringify({ appContext: "DRIVER_APP" }),
      });
      setAccessToken(body.accessToken);
      setUser(body.user);
      setForm({
        displayName: body.user.displayName ?? "",
        city: body.user.driverProfile?.city ?? "",
        bio: body.user.driverProfile?.bio ?? "",
      });
      setStatus("Вход выполнен");
    } catch {
      setStatus("Не удалось подтвердить Telegram");
    }
  }

  async function saveProfile() {
    const body = await request("/me", { method: "PATCH", body: JSON.stringify(form) });
    setUser(body);
    setStatus("Профиль обновлён");
  }

  async function savePreferences(locale: string, theme: string) {
    const body = await request("/me/preferences", {
      method: "PATCH",
      body: JSON.stringify({ locale, theme, notificationsEnabled: true }),
    });
    setUser(body);
  }

  async function logout() {
    await request("/auth/logout", { method: "POST", body: "{}" });
    setAccessToken("");
    setUser(null);
    setStatus("Сессия истекла");
  }

  return (
    <div className="space-y-4">
      <Panel className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-slate-500">Driver identity</div>
            <div className="text-lg font-bold">{user?.displayName ?? "Preview driver"}</div>
          </div>
          <Badge tone={user ? "success" : "warning"}>{status}</Badge>
        </div>
        <Button onClick={mockLogin} className="w-full">
          Mock Telegram login
        </Button>
      </Panel>
      {user ? (
        <>
          <Panel className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge tone="info">{user.driverProfile?.onboardingStatus ?? "NOT_STARTED"}</Badge>
              <Badge tone="warning">
                {user.driverProfile?.verificationStatus ?? "NOT_SUBMITTED"}
              </Badge>
            </div>
            <Button variant="secondary" className="w-full" disabled>
              Подать документы
            </Button>
          </Panel>
          <Panel className="space-y-3">
            {(
              [
                ["displayName", "Display name"],
                ["city", "City"],
                ["bio", "Bio"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm">
                <span className="text-slate-500">{label}</span>
                <input
                  className="mt-1 h-11 w-full rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3"
                  value={form[key as keyof typeof form]}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                />
              </label>
            ))}
            <Button onClick={saveProfile} className="w-full">
              Save profile
            </Button>
          </Panel>
          <Panel className="flex flex-wrap gap-2">
            {["ru", "uz", "kaa"].map((locale) => (
              <Button
                key={locale}
                variant="secondary"
                onClick={() => savePreferences(locale, user.theme)}
              >
                {locale.toUpperCase()}
              </Button>
            ))}
            {["TELEGRAM", "LIGHT", "DARK", "SYSTEM"].map((theme) => (
              <Button
                key={theme}
                variant="secondary"
                onClick={() => savePreferences(user.locale, theme)}
              >
                {theme}
              </Button>
            ))}
            <Button variant="ghost" onClick={logout}>
              Logout
            </Button>
          </Panel>
        </>
      ) : null}
    </div>
  );
}

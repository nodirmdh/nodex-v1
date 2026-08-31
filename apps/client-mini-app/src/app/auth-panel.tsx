"use client";

import { useState } from "react";
import { Badge, Button, Panel } from "@nodex/ui";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000/api/v1";

type CurrentUser = {
  id: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  locale: string;
  theme: string;
  acceptedTermsAt: string | null;
  roles: string[];
  clientProfile?: {
    city?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
  } | null;
};

export function ClientAuthPanel() {
  const [accessToken, setAccessToken] = useState("");
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState("Откройте приложение через Telegram");
  const [form, setForm] = useState({
    displayName: "",
    phone: "",
    city: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });

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
    setStatus("Идёт вход");
    try {
      const body = await request("/auth/mock", {
        method: "POST",
        body: JSON.stringify({ appContext: "CLIENT_APP" }),
      });
      setAccessToken(body.accessToken);
      setUser(body.user);
      setForm({
        displayName: body.user.displayName ?? "",
        phone: body.user.phone ?? "",
        city: body.user.clientProfile?.city ?? "",
        emergencyContactName: body.user.clientProfile?.emergencyContactName ?? "",
        emergencyContactPhone: body.user.clientProfile?.emergencyContactPhone ?? "",
      });
      setStatus("Вход выполнен");
    } catch {
      setStatus("Не удалось подтвердить Telegram");
    }
  }

  async function saveProfile() {
    try {
      const body = await request("/me", { method: "PATCH", body: JSON.stringify(form) });
      setUser(body);
      setStatus("Профиль обновлён");
    } catch {
      setStatus("Попробовать снова");
    }
  }

  async function savePreferences(locale: string, theme: string) {
    const body = await request("/me/preferences", {
      method: "PATCH",
      body: JSON.stringify({ locale, theme, notificationsEnabled: true, marketingEnabled: false }),
    });
    setUser(body);
  }

  async function acceptTerms() {
    const body = await request("/me/accept-terms", { method: "POST", body: "{}" });
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
            <div className="text-sm text-slate-500">Профиль входа</div>
            <div className="text-lg font-bold">
              {user?.displayName ?? "Локальный клиентский preview"}
            </div>
          </div>
          <Badge tone={user ? "success" : "warning"}>{status}</Badge>
        </div>
        <Button onClick={mockLogin} className="w-full">
          Войти через тестовый Telegram
        </Button>
      </Panel>

      {user ? (
        <>
          <Panel className="space-y-3">
            <div className="text-sm font-bold">Профиль</div>
            {(
              [
                ["displayName", "Имя"],
                ["phone", "Телефон"],
                ["city", "Город"],
                ["emergencyContactName", "Экстренный контакт"],
                ["emergencyContactPhone", "Телефон экстренного контакта"],
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
              Сохранить профиль
            </Button>
          </Panel>
          <Panel className="space-y-3">
            <div className="flex flex-wrap gap-2">
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
                  {
                    { TELEGRAM: "Telegram", LIGHT: "Светлая", DARK: "Тёмная", SYSTEM: "Системная" }[
                      theme
                    ]
                  }
                </Button>
              ))}
            </div>
            <Button variant="secondary" onClick={acceptTerms}>
              {user.acceptedTermsAt ? "Условия приняты" : "Принять условия"}
            </Button>
            <Button variant="ghost" onClick={logout}>
              Выйти
            </Button>
          </Panel>
        </>
      ) : null}
    </div>
  );
}

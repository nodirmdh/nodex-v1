"use client";

import { useState } from "react";
import { Card, ClientHeader, ClientShell, SettingsRow, StatusPill } from "../../client-ui";

const initialAvoidedDrivers = [
  { id: "driver-aziz", driver: "Azizbek Karimov", car: "Chevrolet Cobalt · 95 A 214 QA", date: "Сегодня", reason: "опоздание" },
  { id: "driver-sherzod", driver: "Sherzod Rakhimov", car: "BYD Chazor · 90 C 414 HA", date: "12 авг", reason: "не понравилась поездка" },
];

export default function SettingsPage() {
  const [avoidedDrivers, setAvoidedDrivers] = useState(initialAvoidedDrivers);

  return (
    <ClientShell active="profile">
      <ClientHeader
        backHref="/profile"
        level="secondary"
        title="Настройки"
        subtitle="Приватность, версия и документы"
      />

      <Card className="mt-4" compact>
        <SettingsRow
          href="/notifications"
          icon="bell"
          title="Уведомления"
          subtitle="Поездки, сообщения и поддержка"
        />
        <SettingsRow
          href="/safety"
          icon="shield"
          title="Приватность и безопасность"
          subtitle="Доступ к поездке и экстренная помощь"
        />
        <SettingsRow
          href="/support"
          icon="help"
          title="Помощь"
          subtitle="Открыть обращение в поддержку"
        />
      </Card>

      <Card className="mt-3 space-y-3" compact>
        <div>
          <h2 className="m-0 text-base font-black">Не предлагать водителей</h2>
          <p className="m-0 mt-1 text-xs font-semibold text-[rgb(var(--text-muted))]">
            Локальный demo-список доверительных предпочтений для будущего подбора.
          </p>
        </div>
        {avoidedDrivers.length > 0 ? (
          <div className="grid gap-2">
            {avoidedDrivers.map((item) => (
              <div key={item.id} className="rounded-[18px] bg-[rgb(var(--canvas))] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black">{item.driver}</div>
                    <div className="mt-1 text-xs font-semibold text-[rgb(var(--text-muted))]">{item.car}</div>
                    <div className="mt-1 text-xs font-bold text-[rgb(var(--text-muted))]">{item.date} · {item.reason}</div>
                  </div>
                  <button className="min-h-9 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-xs font-black" onClick={() => setAvoidedDrivers((current) => current.filter((driver) => driver.id !== item.id))} type="button">
                    Убрать
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[18px] bg-[rgb(var(--canvas))] p-3 text-sm font-semibold text-[rgb(var(--text-muted))]">Список пуст.</div>
        )}
      </Card>

      <Card className="mt-3 space-y-2" compact>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black">Nodex Client</div>
            <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">Preview build</div>
          </div>
          <StatusPill tone="accent">MVP</StatusPill>
        </div>
      </Card>
    </ClientShell>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatUzs } from "@nodex/ui";
import { Avatar, Card, ClientHeader, ClientShell, Icon, StatusPill } from "../client-ui";

type TripTab = "requests" | "upcoming" | "active" | "completed";

const tabLabels: Array<{ key: TripTab; label: string }> = [
  { key: "requests", label: "Заявки" },
  { key: "upcoming", label: "Предстоящие" },
  { key: "active", label: "Активные" },
  { key: "completed", label: "Завершённые" },
];

const trips = {
  requests: [
    {
      id: "phase6-booking-hold",
      route: "Nukus → Khiva",
      time: "Завтра · 09:00",
      status: "Ожидает водителя",
      seat: "Заднее левое",
      driver: "Подбираем проверенного водителя",
      vehicle: "Заявка на место",
      priceMinor: 9500000,
      tone: "warning" as const,
      cta: "Открыть заявку",
    },
  ],
  upcoming: [
    {
      id: "phase6-booking-confirmed",
      route: "Nukus → Urgench",
      time: "Завтра, 08:30",
      status: "Подтверждено",
      seat: "Переднее пассажирское",
      driver: "Azizbek Karimov",
      vehicle: "Chevrolet Cobalt",
      priceMinor: 8500000,
      tone: "success" as const,
      cta: "Открыть поездку",
    },
  ],
  active: [
    {
      id: "phase6-booking-confirmed?state=active",
      route: "Nukus → Urgench",
      time: "Прибытие 11:30",
      status: "В пути",
      seat: "Переднее пассажирское",
      driver: "Azizbek Karimov",
      vehicle: "Chevrolet Cobalt",
      priceMinor: 8500000,
      tone: "info" as const,
      cta: "Отследить поездку",
    },
  ],
  completed: [
    {
      id: "phase6-booking-confirmed?state=completed",
      route: "Nukus → Urgench",
      time: "Завершено, 8 августа",
      status: "Завершённые",
      seat: "Переднее пассажирское",
      driver: "Azizbek Karimov",
      vehicle: "Chevrolet Cobalt",
      priceMinor: 8500000,
      tone: "accent" as const,
      cta: "Оценить водителя",
    },
  ],
};

export default function TripsPage() {
  const [activeTab, setActiveTab] = useState<TripTab>("requests");

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "upcoming" || tab === "active" || tab === "completed") setActiveTab(tab);
  }, []);

  return (
    <ClientShell active="trips">
      <ClientHeader title="Поездки" subtitle="Заявки, поездки и история" />

      <section
        className="-mx-4 mt-4 flex snap-x gap-1.5 overflow-x-auto px-4 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Вкладки статуса поездок"
      >
        {tabLabels.map((tab) => (
          <button
            key={tab.key}
            className={[
              "min-h-10 shrink-0 snap-start rounded-full px-3 text-[13px] font-black shadow-[var(--shadow-xs)]",
              activeTab === tab.key
                ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                : "bg-[rgb(var(--surface))] text-[rgb(var(--text-muted))]",
            ].join(" ")}
            type="button"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </section>

      <section aria-label="Поездки клиента" className="mt-2.5 grid gap-3">
        {trips[activeTab].map((trip) => (
          <Card
            key={trip.id}
            compact
            className={
              activeTab === "requests"
                ? "space-y-3 ring-1 ring-[rgb(var(--warning)/0.16)]"
                : activeTab === "completed"
                  ? "space-y-3"
                  : "space-y-3.5"
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="m-0 truncate text-lg font-black">{trip.route}</h2>
                <p className="m-0 mt-1 flex items-center gap-1 text-sm font-semibold text-[rgb(var(--text-muted))]">
                  <Icon name="clock" className="h-4 w-4" />
                  {trip.time}
                </p>
              </div>
              <StatusPill tone={trip.tone}>{trip.status}</StatusPill>
            </div>

            <div
              className={
                activeTab === "requests"
                  ? "rounded-[20px] bg-[rgb(var(--warning-soft))] p-3"
                  : "grid grid-cols-[auto_1fr] gap-3 rounded-[20px] bg-[rgb(var(--canvas))] p-3"
              }
            >
              {activeTab === "requests" ? null : <Avatar name={trip.driver} />}
              <div className="min-w-0">
                <div className="truncate text-sm font-black">
                  {activeTab === "requests" ? "Заявка отправлена" : trip.driver}
                </div>
                <div className="mt-1 text-xs font-semibold text-[rgb(var(--text-muted))]">
                  {activeTab === "requests"
                    ? `${trip.seat} · ожидает подтверждения водителя`
                    : `${trip.vehicle} · ${trip.seat}`}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusPill tone="accent">{formatUzs(trip.priceMinor)}</StatusPill>
                  <StatusPill subtle>
                    {activeTab === "completed" ? "Указанная цена" : "Цена за место"}
                  </StatusPill>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeTab === "requests" ? (
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--canvas))] px-4 text-sm font-black text-[rgb(var(--text-muted))] no-underline"
                  href="/bookings/phase6-booking-hold?state=cancelled"
                >
                  Отменить заявку
                </Link>
              ) : (
                <Link
                  className="min-h-11 rounded-full bg-[rgb(var(--canvas))] px-4 py-3 text-sm font-black text-[rgb(var(--primary))] no-underline"
                  href="/messages/driver-azizbek"
                >
                  Написать водителю
                </Link>
              )}
              <Link
                className="ml-auto inline-flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--primary))] px-5 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline shadow-[var(--shadow-md)]"
                href={`/bookings/${trip.id}`}
              >
                {trip.cta}
              </Link>
            </div>
          </Card>
        ))}
      </section>
    </ClientShell>
  );
}

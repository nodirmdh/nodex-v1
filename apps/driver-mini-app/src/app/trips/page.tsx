"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DriverCard, DriverHeader, DriverIconView, DriverPill, DriverShell } from "../driver-ui";

type TripTab = "upcoming" | "active" | "completed";
type TripTone = "success" | "warning" | "info" | "neutral" | "danger";

type TripCard = {
  id: string;
  tab: TripTab;
  route: string;
  departure: string;
  vehicle: string;
  reserved: number;
  seats: number;
  pending: number;
  boarded: number;
  status: string;
  tone: TripTone;
  cta: string;
  href: string;
  summary: string;
};

const trips: TripCard[] = [
  {
    id: "upcoming-urgench",
    tab: "upcoming",
    route: "Nukus → Urgench",
    departure: "Завтра, 08:30",
    vehicle: "Chevrolet Cobalt · 95 A 214 QA",
    reserved: 3,
    seats: 4,
    pending: 1,
    boarded: 0,
    status: "Запланирована",
    tone: "info",
    cta: "Открыть",
    href: "/trip-demo",
    summary: "Проверьте одну ожидающую заявку перед выездом.",
  },
  {
    id: "upcoming-khiva",
    tab: "upcoming",
    route: "Nukus → Khiva",
    departure: "Пт, 16:40",
    vehicle: "Chevrolet Tracker · 95 B 412 QA",
    reserved: 2,
    seats: 4,
    pending: 0,
    boarded: 0,
    status: "Опубликована",
    tone: "success",
    cta: "Открыть",
    href: "/trip-demo",
    summary: "Готово для пассажиров и передачи посылки.",
  },
  {
    id: "active-urgench",
    tab: "active",
    route: "Nukus → Urgench",
    departure: "Сегодня, 08:30",
    vehicle: "Chevrolet Cobalt · 95 A 214 QA",
    reserved: 3,
    seats: 4,
    pending: 0,
    boarded: 2,
    status: "В пути",
    tone: "warning",
    cta: "Управлять",
    href: "/trip-demo?state=active",
    summary: "2 из 3 пассажиров на борту. Завершите поездку после прибытия.",
  },
  {
    id: "completed-bukhara",
    tab: "completed",
    route: "Nukus → Bukhara",
    departure: "Вчера, 09:00",
    vehicle: "Chevrolet Cobalt · 95 A 214 QA",
    reserved: 4,
    seats: 4,
    pending: 0,
    boarded: 4,
    status: "Завершена",
    tone: "success",
    cta: "История",
    href: "/trip-demo?state=completed",
    summary: "4 пассажира перевезены. Маршрут можно повторить из истории.",
  },
];

const tabs: Array<{ key: TripTab; label: string }> = [
  { key: "upcoming", label: "Будущие" },
  { key: "active", label: "Активные" },
  { key: "completed", label: "История" },
];

export default function DriverTripsPage() {
  const [tab, setTab] = useState<TripTab>("upcoming");

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("tab");
    if (next === "active" || next === "completed" || next === "upcoming") setTab(next);
  }, []);

  const visibleTrips = useMemo(() => trips.filter((trip) => trip.tab === tab), [tab]);

  return (
    <DriverShell active="trips">
      <DriverHeader
        title="Поездки"
        subtitle="Маршруты, посадка и история"
        status={<DriverPill tone="success">Проверен</DriverPill>}
      />

      <DriverCard className="mt-4 space-y-3" label="Driver trips overview">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="m-0 text-xl font-black">Поездки</h1>
            <p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Что нужно проверить перед каждым выездом.
            </p>
          </div>
          <Link
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline"
            href="/create-trip-demo"
          >
            Create trip
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-full bg-[rgb(var(--canvas))] p-1">
          {tabs.map((item) => (
            <button
              key={item.key}
              className={[
                "min-h-10 rounded-full border-0 px-2 text-xs font-black",
                tab === item.key
                  ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                  : "bg-transparent text-[rgb(var(--text-muted))]",
              ].join(" ")}
              onClick={() => setTab(item.key)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </DriverCard>

      <DriverCard className="mt-3 space-y-3" label="ENVO fill and return shortcuts">
        <div className="grid gap-3 sm:grid-cols-2">
          <Link className="block rounded-[18px] bg-[rgb(var(--canvas))] p-3 text-[rgb(var(--foreground))] no-underline" href="/passengers-demo?sheet=accept">
            <div className="flex items-center justify-between gap-2">
              <h2 className="m-0 text-base font-black">ENVO Fill</h2>
              <DriverPill tone="info">2 requests</DriverPill>
            </div>
            <p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Есть пассажиры на ваш маршрут. Проверьте подходящие запросы без лишних данных клиента.
            </p>
          </Link>
          <Link className="block rounded-[18px] bg-[rgb(var(--canvas))] p-3 text-[rgb(var(--foreground))] no-underline" href="/create-trip-demo?return=1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="m-0 text-base font-black">ENVO Return</h2>
              <DriverIconView name="route" className="h-5 w-5 text-[rgb(var(--primary))]" />
            </div>
            <p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Быстро подготовьте обратный рейс. Публикация только после вашего подтверждения.
            </p>
          </Link>
        </div>
      </DriverCard>      <section aria-label="Driver trip list" className="mt-3 space-y-3">
        {visibleTrips.map((trip) => (
          <DriverTripCard key={trip.id} trip={trip} />
        ))}
      </section>

      <DriverCard className="mt-3 space-y-3" label="Создание поездки">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]">
            <DriverIconView name="route" />
          </span>
          <div>
            <h2 className="m-0 text-lg font-black">Создание поездки</h2>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Маршрут, проверенная машина, остановки, места, посылки и проверка данных.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {["Маршрут", "Машина", "Публикация"].map((step, index) => (
            <div key={step} className="rounded-[16px] bg-[rgb(var(--canvas))] p-2">
              <div className="text-xs font-black text-[rgb(var(--primary))]">{index + 1}</div>
              <div className="text-[11px] font-bold text-[rgb(var(--text-muted))]">{step}</div>
            </div>
          ))}
        </div>
        <Link
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline"
          href="/create-trip-demo"
        >
          Продолжить создание
        </Link>
      </DriverCard>
    </DriverShell>
  );
}

function DriverTripCard({ trip }: { trip: TripCard }) {
  const available = Math.max(trip.seats - trip.reserved, 0);
  return (
    <DriverCard
      className={[
        "space-y-3",
        trip.tab === "active" ? "ring-1 ring-[rgb(var(--warning)/0.28)]" : "",
      ].join(" ")}
      label={`${trip.status} trip ${trip.route}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="m-0 text-lg font-black">{trip.route}</h2>
          <p className="m-0 mt-1 flex items-center gap-1 text-sm font-semibold text-[rgb(var(--text-muted))]">
            <DriverIconView name="clock" className="h-4 w-4" />
            {trip.departure}
          </p>
        </div>
        <DriverPill tone={trip.tone}>{trip.status}</DriverPill>
      </div>

      <div className="rounded-[18px] bg-[rgb(var(--canvas))] p-3">
        <div className="truncate text-sm font-black">{trip.vehicle}</div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <Metric label="Занято" value={`${trip.reserved}/${trip.seats}`} />
          <Metric label="Ожидают" value={String(trip.pending)} />
          <Metric label="Свободно" value={String(available)} />
        </div>
      </div>

      <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">{trip.summary}</p>
      <div className="grid grid-cols-[1fr_auto] items-center gap-2">
        <div className="h-2 overflow-hidden rounded-full bg-[rgb(var(--canvas))]">
          <div
            className="h-full rounded-full bg-[rgb(var(--primary))]"
            style={{ width: `${Math.min((trip.reserved / trip.seats) * 100, 100)}%` }}
          />
        </div>
        <Link
          className="inline-flex min-h-10 items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline"
          href={trip.href}
        >
          {trip.cta}
        </Link>
      </div>
    </DriverCard>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm font-black">{value}</div>
      <div className="text-[10px] font-bold text-[rgb(var(--text-muted))]">{label}</div>
    </div>
  );
}

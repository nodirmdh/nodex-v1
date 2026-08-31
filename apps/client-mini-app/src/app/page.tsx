"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ClientBottomNav } from "./client-ui";

type IconName =
  | "bell"
  | "calendar"
  | "car"
  | "chevron"
  | "clock"
  | "map"
  | "message"
  | "navigation"
  | "shield"
  | "star"
  | "swap"
  | "user"
  | "users";

type PickerKey = "from" | "to" | "date" | "passengers";

const iconPaths: Record<IconName, ReactNode> = {
  bell: <path d="M8 17h8M9 17a3 3 0 0 0 6 0M6 14h12l-1.6-2.2V8.8a4.4 4.4 0 0 0-8.8 0v3L6 14Z" />,
  calendar: (
    <path d="M7 5v3M17 5v3M5 9h14M6 6h12a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />
  ),
  car: (
    <>
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </>
  ),
  chevron: <path d="m9 6 6 6-6 6" />,
  clock: <path d="M12 6v6l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  map: (
    <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Zm0-8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
  ),
  message: <path d="M5 18v-4.5A7.5 7.5 0 1 1 9.5 20H6.8A1.8 1.8 0 0 1 5 18Z" />,
  navigation: <path d="m6 12 12-6-5 12-2-5-5-1Z" />,
  shield: <path d="M12 21c5-2.4 7-5.6 7-10V6l-7-3-7 3v5c0 4.4 2 7.6 7 10Zm-3-9 2 2 4-5" />,
  star: <path d="m12 4 2.2 4.7 5.1.6-3.8 3.5 1 5-4.5-2.5-4.5 2.5 1-5-3.8-3.5 5.1-.6L12 4Z" />,
  swap: <path d="M7 7h10m0 0-3-3m3 3-3 3M17 17H7m0 0 3 3m-3-3 3-3" />,
  user: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" />,
  users: (
    <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6.5-.5a2.5 2.5 0 1 0 0-5M3.5 19a5.5 5.5 0 0 1 11 0M14 15.5c2.5.3 4.2 1.5 5 3.5" />
  ),
};

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.15"
      viewBox="0 0 24 24"
      width="20"
    >
      {iconPaths[name]}
    </svg>
  );
}

const cities = ["Nukus", "Urgench", "Khiva", "Kungrad"];
const dates = [
  { label: "Сегодня", value: "today" },
  { label: "Завтра", value: "tomorrow" },
  { label: "На выходных", value: "weekend" },
];
const passengerOptions = [
  { label: "1 пассажир", value: "1" },
  { label: "2 пассажира", value: "2" },
  { label: "3 пассажира", value: "3" },
  { label: "4 пассажира", value: "4" },
];

const rides = [
  {
    id: "phase5-nukus-urgench-morning",
    from: "Nukus",
    to: "Urgench",
    time: "08:30",
    date: "Завтра",
    driver: "Azizbek",
    rating: "4.9",
    vehicle: "Chevrolet Cobalt",
    seats: "3 места",
    price: "85k",
    tier: "Комфорт",
    href: "/trips/phase5-nukus-urgench-morning",
  },
  {
    id: "phase5-nukus-khiva-evening",
    from: "Nukus",
    to: "Khiva",
    time: "16:40",
    date: "Сегодня",
    driver: "Madina",
    rating: "4.8",
    vehicle: "Chevrolet Tracker",
    seats: "2 места",
    price: "110k",
    tier: "Премиум",
    href: "/search?from=Nukus&to=Khiva",
  },
];

const recentRoutes = [
  { label: "Nukus → Kungrad", href: "/search?from=Nukus&to=Kungrad", count: "4 поездки сегодня" },
  { label: "Nukus → Urgench", href: "/search?from=Nukus&to=Urgench", count: "6 поездок сегодня" },
  { label: "Nukus → Khiva", href: "/search?from=Nukus&to=Khiva", count: "3 поездки сегодня" },
  { label: "Urgench → Nukus", href: "/search?from=Urgench&to=Nukus", count: "5 поездок сегодня" },
];

function VehicleMark() {
  return (
    <div className="grid aspect-[16/10] w-[70px] shrink-0 place-items-center overflow-hidden rounded-[22px] bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))] shadow-[var(--shadow-xs)]">
      <Icon name="car" className="h-10 w-10" />
    </div>
  );
}

function Picker({
  id,
  icon,
  label,
  value,
  options,
  open,
  compact = false,
  onOpen,
  onSelect,
}: {
  id: PickerKey;
  icon: IconName;
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  open: PickerKey | null;
  compact?: boolean;
  onOpen: (id: PickerKey | null) => void;
  onSelect: (value: string) => void;
}) {
  const selected = options.find((option) => option.value === value)?.label ?? value;
  const expanded = open === id;

  return (
    <div className="relative">
      <button
        aria-expanded={expanded}
        aria-label={label}
        className={[
          "flex w-full items-center gap-3 rounded-[22px] bg-[rgb(var(--canvas))] text-left shadow-[inset_0_0_0_1px_rgb(var(--border)/0.45)] transition active:scale-[0.99]",
          compact ? "min-h-[48px] px-3" : "min-h-[64px] px-3 pr-14",
        ].join(" ")}
        type="button"
        onClick={() => onOpen(expanded ? null : id)}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[rgb(var(--surface))] text-[rgb(var(--primary))] shadow-[var(--shadow-xs)]">
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="text-[11px] font-black uppercase tracking-[0.08em] text-[rgb(var(--text-subtle))]">
            {label}
          </span>
          <span className="truncate text-lg font-black leading-tight text-[rgb(var(--foreground))]">
            {selected}
          </span>
        </span>
        <Icon
          name="chevron"
          className={[
            "h-4 w-4 text-[rgb(var(--text-muted))] transition",
            expanded ? "-rotate-90" : "rotate-90",
          ].join(" ")}
        />
      </button>

      {expanded ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-[22px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-1.5 shadow-[var(--shadow-floating)]">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                className={[
                  "flex min-h-10 w-full items-center justify-between rounded-[16px] px-3 text-left text-sm font-black transition",
                  active
                    ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                    : "text-[rgb(var(--foreground))] hover:bg-[rgb(var(--canvas))]",
                ].join(" ")}
                type="button"
                onClick={() => {
                  onSelect(option.value);
                  onOpen(null);
                }}
              >
                {option.label}
                {active ? <span className="text-xs">✓</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function RideCard({ ride }: { ride: (typeof rides)[number] }) {
  return (
    <Link
      href={ride.href}
      className="block rounded-[26px] bg-[rgb(var(--surface))] p-4 text-[rgb(var(--foreground))] no-underline shadow-[var(--shadow-md)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[rgb(var(--text-muted))]">
            <Icon name="clock" className="h-4 w-4" />
            {ride.date}, {ride.time}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xl font-extrabold leading-none">{ride.from}</span>
            <Icon name="navigation" className="h-4 w-4 text-[rgb(var(--primary))]" />
            <span className="text-xl font-extrabold leading-none">{ride.to}</span>
          </div>
        </div>
        <span className="rounded-full bg-[rgb(var(--primary))] px-3 py-2 text-sm font-extrabold text-[rgb(var(--primary-foreground))] shadow-[var(--shadow-sm)]">
          {ride.price}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <VehicleMark />
        <div className="min-w-0 flex-1">
          <div className="mb-2 inline-flex rounded-full bg-[rgb(var(--surface-blue))] px-2.5 py-1 text-[11px] font-black text-[rgb(var(--info))]">
            Тариф {ride.tier}
          </div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[rgb(var(--surface-tint))] text-xs font-extrabold text-[rgb(var(--primary))]">
              {ride.driver[0]}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold">{ride.driver}</div>
              <div className="truncate text-xs font-medium text-[rgb(var(--text-muted))]">
                {ride.vehicle}
              </div>
            </div>
          </div>
        </div>
        <div className="grid justify-items-end gap-1 text-xs font-bold">
          <span className="flex items-center gap-1 text-[rgb(var(--gold))]">
            <Icon name="star" className="h-3.5 w-3.5" />
            {ride.rating}
          </span>
          <span className="rounded-full bg-[rgb(var(--surface-blue))] px-2.5 py-1 text-[rgb(var(--info))]">
            {ride.seats}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const [from, setFrom] = useState("Nukus");
  const [to, setTo] = useState("Urgench");
  const [date, setDate] = useState("tomorrow");
  const [passengers, setPassengers] = useState("2");
  const [openPicker, setOpenPicker] = useState<PickerKey | null>(null);

  const searchHref = useMemo(
    () =>
      `/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}&passengers=${passengers}`,
    [date, from, passengers, to],
  );

  return (
    <main className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      <div className="mx-auto min-h-screen max-w-[430px] overflow-hidden bg-[linear-gradient(180deg,rgb(var(--surface-tint))_0%,rgb(var(--background))_34%,rgb(var(--canvas))_100%)] px-4 pb-28 pt-4">
        <header className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-[rgb(var(--primary))]">Nodex</div>
            <h1 className="m-0 text-[1.55rem] font-extrabold leading-tight tracking-normal">
              Куда едем сегодня?
            </h1>
          </div>
          <div className="flex gap-2">
            <Link
              aria-label="Уведомления"
              className="grid h-11 w-11 place-items-center rounded-full bg-[rgb(var(--surface)/0.9)] text-[rgb(var(--foreground))] shadow-[var(--shadow-xs)] backdrop-blur"
              href="/notifications"
            >
              <Icon name="bell" className="h-5 w-5" />
            </Link>
            <Link
              aria-label="Профиль"
              className="grid h-11 w-11 place-items-center rounded-full bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] shadow-[var(--shadow-sm)]"
              href="/profile"
            >
              <Icon name="user" className="h-5 w-5" />
            </Link>
          </div>
        </header>

        <section className="mt-5 rounded-[30px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-floating)]">
          <div className="relative grid gap-3">
            <div className="absolute left-[31px] top-[42px] h-[82px] w-0.5 rounded-full bg-[linear-gradient(180deg,rgb(var(--primary)/0.28),rgb(var(--primary)/0.08))]" />
            <Picker
              id="from"
              icon="navigation"
              label="Откуда"
              open={openPicker}
              options={cities.map((city) => ({ label: city, value: city }))}
              value={from}
              onOpen={setOpenPicker}
              onSelect={setFrom}
            />

            <button
              aria-label="Поменять направление"
              className="absolute right-4 top-1/2 z-30 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] shadow-[0_16px_32px_rgb(var(--primary)/0.3)] transition active:scale-95"
              type="button"
              onClick={() => {
                setFrom(to);
                setTo(from);
                setOpenPicker(null);
              }}
            >
              <Icon name="swap" className="h-5 w-5" />
            </button>

            <Picker
              id="to"
              icon="map"
              label="Куда"
              open={openPicker}
              options={cities.map((city) => ({ label: city, value: city }))}
              value={to}
              onOpen={setOpenPicker}
              onSelect={setTo}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Picker
              compact
              id="date"
              icon="calendar"
              label="Дата"
              open={openPicker}
              options={dates}
              value={date}
              onOpen={setOpenPicker}
              onSelect={setDate}
            />
            <Picker
              compact
              id="passengers"
              icon="users"
              label="Пассажиры"
              open={openPicker}
              options={passengerOptions}
              value={passengers}
              onOpen={setOpenPicker}
              onSelect={setPassengers}
            />
          </div>

          <Link
            href={searchHref}
            className="mt-4 flex min-h-[52px] items-center justify-center rounded-[18px] bg-[rgb(var(--primary))] text-base font-extrabold text-[rgb(var(--primary-foreground))] no-underline shadow-[var(--shadow-md)]"
          >
            Найти поездки
          </Link>
        </section>

        <section className="mt-4 rounded-[24px] bg-[linear-gradient(135deg,rgb(var(--primary)),rgb(var(--foreground)))] p-4 text-[rgb(var(--primary-foreground))] shadow-[var(--shadow-md)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.1em] opacity-75">
                Новости
              </div>
              <div className="mt-1 text-lg font-black">Запрос места без оплаты в приложении</div>
              <p className="m-0 mt-1 text-sm font-semibold opacity-80">
                Вы отправляете заявку, водитель подтверждает, оплата согласуется напрямую.
              </p>
            </div>
            <Icon name="message" className="h-5 w-5 shrink-0 opacity-85" />
          </div>
        </section>

        <section className="mt-4 rounded-[24px] bg-[rgb(var(--foreground))] p-4 text-[rgb(var(--background))] shadow-[var(--shadow-md)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold opacity-70">Ближайшая заявка</div>
              <div className="mt-1 text-lg font-extrabold">Nukus → Urgench</div>
              <div className="text-sm font-medium opacity-75">Завтра, 08:30</div>
            </div>
            <span className="rounded-full bg-[rgb(var(--warning-soft))] px-3 py-1.5 text-xs font-extrabold text-[rgb(var(--warning))]">
              Ожидает водителя
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs font-semibold opacity-80">
            <Icon name="shield" className="h-4 w-4" />
            Контакт откроется после подтверждения водителем
          </div>
        </section>

        <section className="mt-5">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="m-0 text-lg font-extrabold">Рекомендуемые поездки</h2>
              <p className="m-0 text-sm font-medium text-[rgb(var(--text-muted))]">
                Проверенные водители рядом с вашим маршрутом
              </p>
            </div>
            <Link
              href="/search"
              className="flex items-center gap-1 text-sm font-extrabold text-[rgb(var(--primary))] no-underline"
            >
              Все
              <Icon name="chevron" className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-3">
            {rides.map((ride) => (
              <RideCard key={ride.id} ride={ride} />
            ))}
          </div>
        </section>

        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="m-0 text-lg font-extrabold">Популярные маршруты</h2>
            <Icon name="car" className="h-5 w-5 text-[rgb(var(--primary))]" />
          </div>
          <div
            aria-label="Популярные маршруты"
            className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {recentRoutes.map((route) => (
              <Link
                key={route.label}
                href={route.href}
                className="min-w-[172px] snap-start rounded-[22px] bg-[rgb(var(--surface))] p-3 text-[rgb(var(--foreground))] no-underline shadow-[var(--shadow-sm)]"
              >
                <span className="block text-sm font-extrabold">{route.label}</span>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[rgb(var(--text-muted))]">
                  <Icon name="clock" className="h-3.5 w-3.5" />
                  {route.count}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <ClientBottomNav active="home" />
    </main>
  );
}

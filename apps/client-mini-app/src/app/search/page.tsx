"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Badge, Button, VehicleImage, formatUzs } from "@nodex/ui";

type IconName =
  | "back"
  | "calendar"
  | "car"
  | "clock"
  | "filter"
  | "home"
  | "message"
  | "navigation"
  | "star"
  | "user"
  | "users";

const iconPaths: Record<IconName, ReactNode> = {
  back: <path d="m15 6-6 6 6 6" />,
  calendar: (
    <path d="M7 5v3M17 5v3M5 9h14M6 6h12a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />
  ),
  car: (
    <path d="M5 14h14l-1.8-4.2A2 2 0 0 0 15.4 8H8.6a2 2 0 0 0-1.8 1.2L5 14Zm1 0v4m12-4v4M7.5 18h.1m8.8 0h.1" />
  ),
  clock: <path d="M12 6v6l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  filter: <path d="M4 7h16M7 12h10M10 17h4" />,
  home: <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-5v-5h-4v5H5a1 1 0 0 1-1-1v-7.5Z" />,
  message: <path d="M5 18v-4.5A7.5 7.5 0 1 1 9.5 20H6.8A1.8 1.8 0 0 1 5 18Z" />,
  navigation: <path d="m6 12 12-6-5 12-2-5-5-1Z" />,
  star: <path d="m12 4 2.2 4.7 5.1.6-3.8 3.5 1 5-4.5-2.5-4.5 2.5 1-5-3.8-3.5 5.1-.6L12 4Z" />,
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
      height="18"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="18"
    >
      {iconPaths[name]}
    </svg>
  );
}

const trips = [
  {
    id: "phase5-nukus-urgench-morning",
    origin: "Nukus",
    destination: "Urgench",
    date: "2026-08-08",
    departure: "08:30",
    arrival: "11:30",
    seats: 4,
    priceMinor: 8500000,
    driver: "Azizbek Karimov",
    rating: "4.9",
    trips: "268 rides",
    response: "Fast response",
    vehicle: "Chevrolet Cobalt",
    vehicleMeta: "White, 4 seats",
    parcel: true,
    luggage: true,
    recommended: true,
  },
  {
    id: "phase5-nukus-urgench-evening",
    origin: "Nukus",
    destination: "Urgench",
    date: "2026-08-08",
    departure: "18:10",
    arrival: "21:05",
    seats: 2,
    priceMinor: 9200000,
    driver: "Madina Yusupova",
    rating: "4.8",
    trips: "142 rides",
    response: "Reliable",
    vehicle: "Chevrolet Tracker",
    vehicleMeta: "Silver, 4 seats",
    parcel: false,
    luggage: true,
    recommended: false,
  },
  {
    id: "phase5-nukus-khiva",
    origin: "Nukus",
    destination: "Khiva",
    date: "2026-08-10",
    departure: "09:00",
    arrival: "12:30",
    seats: 1,
    priceMinor: 9500000,
    driver: "Sherzod Rakhimov",
    rating: "4.7",
    trips: "94 rides",
    response: "Verified",
    vehicle: "BYD Chazor",
    vehicleMeta: "Blue, 4 seats",
    parcel: true,
    luggage: true,
    recommended: false,
  },
];

const filterChips = [
  "Recommended",
  "Cheapest",
  "Earliest",
  "Top rated",
  "Front seat",
  "Parcel",
  "Luggage",
];

export default function SearchPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sort, setSort] = useState("Recommended");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("filters") === "open") setSheetOpen(true);
  }, []);

  const sortedTrips = useMemo(() => {
    const list = [...trips];
    if (sort === "Cheapest") return list.sort((a, b) => a.priceMinor - b.priceMinor);
    if (sort === "Earliest") return list.sort((a, b) => a.departure.localeCompare(b.departure));
    if (sort === "Top rated") return list.sort((a, b) => Number(b.rating) - Number(a.rating));
    return list.sort((a, b) => Number(b.recommended) - Number(a.recommended));
  }, [sort]);

  return (
    <main className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      <div className="mx-auto min-h-screen max-w-[430px] overflow-hidden bg-[linear-gradient(180deg,rgb(var(--surface-tint))_0%,rgb(var(--background))_28%,rgb(var(--canvas))_100%)] px-4 pb-28 pt-4">
        <header className="flex items-center gap-3">
          <Link
            aria-label="Back home"
            className="grid h-11 w-11 place-items-center rounded-full bg-[rgb(var(--surface)/0.92)] text-[rgb(var(--foreground))] shadow-[var(--shadow-xs)]"
            href="/"
          >
            <Icon name="back" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xl font-extrabold leading-tight">
              <span>Nukus</span>
              <Icon name="navigation" className="h-4 w-4 text-[rgb(var(--primary))]" />
              <span>Urgench</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-[rgb(var(--text-muted))]">
              <Icon name="calendar" className="h-4 w-4" />
              Tomorrow
              <span>·</span>
              <Icon name="users" className="h-4 w-4" />2 passengers
            </div>
          </div>
          <button
            aria-label="Open filters"
            className="grid h-11 w-11 place-items-center rounded-full bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] shadow-[var(--shadow-md)]"
            onClick={() => setSheetOpen(true)}
          >
            <Icon name="filter" />
          </button>
        </header>

        <section
          className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-2"
          aria-label="Quick filters"
        >
          {filterChips.map((chip) => (
            <button
              key={chip}
              className={[
                "min-h-10 shrink-0 rounded-full px-4 text-sm font-extrabold shadow-[var(--shadow-xs)]",
                sort === chip
                  ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                  : "bg-[rgb(var(--surface))] text-[rgb(var(--text-muted))]",
              ].join(" ")}
              onClick={() => setSort(chip)}
            >
              {chip}
            </button>
          ))}
        </section>

        <section className="mt-2">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h1 className="m-0 text-2xl font-extrabold">Available rides</h1>
              <p className="m-0 text-sm font-medium text-[rgb(var(--text-muted))]">
                Verified drivers. Price is per seat.
              </p>
            </div>
            <Badge tone="accent">{sortedTrips.length} found</Badge>
          </div>

          <div className="grid gap-3">
            {sortedTrips.map((trip) => (
              <Link
                key={trip.id}
                className={[
                  "block rounded-[28px] bg-[rgb(var(--surface))] p-4 text-[rgb(var(--foreground))] no-underline shadow-[var(--shadow-md)]",
                  trip.recommended ? "ring-2 ring-[rgb(var(--accent)/0.22)]" : "",
                  trip.seats === 1
                    ? "bg-[linear-gradient(180deg,rgb(var(--surface)),rgb(var(--warning-soft)/0.35))]"
                    : "",
                ].join(" ")}
                href={`/trips/${trip.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-[rgb(var(--text-muted))]">
                      <Icon name="clock" className="h-4 w-4" />
                      {trip.departure} - {trip.arrival}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xl font-extrabold leading-none">
                      {trip.origin}
                      <Icon name="navigation" className="h-4 w-4 text-[rgb(var(--primary))]" />
                      {trip.destination}
                    </div>
                  </div>
                  <div className="text-right">
                    {trip.recommended ? <Badge tone="accent">Best match</Badge> : null}
                    <div className="mt-2 rounded-full bg-[rgb(var(--primary))] px-3 py-2 text-sm font-extrabold text-[rgb(var(--primary-foreground))]">
                      {formatUzs(trip.priceMinor)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-[86px_1fr] gap-3">
                  <VehicleImage alt={trip.vehicle} className="rounded-[22px]" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-[rgb(var(--surface-tint))] text-xs font-extrabold text-[rgb(var(--primary))]">
                        {trip.driver[0]}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold">{trip.driver}</div>
                        <div className="flex items-center gap-2 text-xs font-bold text-[rgb(var(--text-muted))]">
                          <Icon name="star" className="h-3.5 w-3.5 text-[rgb(var(--gold))]" />
                          {trip.rating}
                          <span>·</span>
                          {trip.trips}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm font-bold">{trip.vehicle}</div>
                    <div className="text-xs font-medium text-[rgb(var(--text-muted))]">
                      {trip.vehicleMeta}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge tone={trip.seats === 1 ? "warning" : "info"}>
                    {trip.seats} seat{trip.seats === 1 ? "" : "s"} left
                  </Badge>
                  {trip.luggage ? <Badge tone="accent">Luggage</Badge> : null}
                  {trip.parcel ? <Badge tone="info">Parcel</Badge> : null}
                  <Badge>{trip.response}</Badge>
                  <span className="ml-auto flex items-center gap-1 text-sm font-extrabold text-[rgb(var(--primary))]">
                    View
                    <Icon name="navigation" className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <nav className="fixed inset-x-4 bottom-4 z-[var(--z-nav)] mx-auto max-w-[398px] rounded-full bg-[rgb(var(--surface)/0.94)] p-1.5 shadow-[var(--shadow-floating)] backdrop-blur-xl">
        <div className="grid grid-cols-4 gap-1">
          {[
            { label: "Home", icon: "home" as const, active: false, href: "/" },
            { label: "Trips", icon: "car" as const, active: true, href: "/bookings" },
            { label: "Messages", icon: "message" as const, active: false, href: "/messages" },
            { label: "Profile", icon: "user" as const, active: false, href: "/profile" },
          ].map((item) => (
            <Link
              key={item.label}
              className={[
                "grid min-h-[54px] place-items-center rounded-full px-2 text-[11px] font-bold no-underline",
                item.active
                  ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] shadow-[var(--shadow-sm)]"
                  : "text-[rgb(var(--text-muted))]",
              ].join(" ")}
              href={item.href}
            >
              <Icon name={item.icon} className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {sheetOpen ? (
        <div className="fixed inset-0 z-[var(--z-modal)] bg-[rgb(var(--overlay)/0.34)]">
          <button
            aria-label="Close filters"
            className="absolute inset-0 h-full w-full"
            onClick={() => setSheetOpen(false)}
          />
          <section className="absolute inset-x-0 bottom-0 mx-auto max-w-[430px] rounded-t-[32px] bg-[rgb(var(--surface))] p-5 pb-[calc(1.25rem+var(--safe-bottom))] shadow-[var(--shadow-floating)]">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[rgb(var(--border-strong))]" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-xl font-extrabold">Filters</h2>
                <p className="m-0 text-sm font-medium text-[rgb(var(--text-muted))]">
                  Refine supported options only.
                </p>
              </div>
              <button className="text-sm font-extrabold text-[rgb(var(--primary))]">Reset</button>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <h3 className="m-0 mb-2 text-sm font-extrabold">Departure</h3>
                <div className="grid grid-cols-3 gap-2">
                  {["Morning", "Afternoon", "Evening"].map((item) => (
                    <button
                      key={item}
                      className="min-h-11 rounded-full bg-[rgb(var(--canvas))] text-sm font-bold"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="m-0 mb-2 text-sm font-extrabold">Driver and comfort</h3>
                <div className="flex flex-wrap gap-2">
                  {["Verified driver", "4.8+ rating", "Luggage", "Parcel", "2+ seats"].map(
                    (item) => (
                      <button
                        key={item}
                        className="min-h-11 rounded-full bg-[rgb(var(--surface-tint))] px-4 text-sm font-bold text-[rgb(var(--primary))]"
                      >
                        {item}
                      </button>
                    ),
                  )}
                </div>
              </div>
              <div className="rounded-[22px] bg-[rgb(var(--canvas))] p-3 text-sm font-medium text-[rgb(var(--text-muted))]">
                Price range, vehicle type and front-seat filters are prepared for UI, but not
                applied here unless supported by the current search data.
              </div>
            </div>

            <div className="mt-5 grid grid-cols-[0.8fr_1.2fr] gap-2">
              <Button variant="secondary" onClick={() => setSheetOpen(false)}>
                Reset
              </Button>
              <Button onClick={() => setSheetOpen(false)}>Apply filters</Button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

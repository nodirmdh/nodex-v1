"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatUzs } from "@nodex/ui";
import { Avatar, Card, ClientHeader, ClientShell, Icon, StatusPill } from "../client-ui";

type TripTab = "requests" | "upcoming" | "active" | "completed";

const tabLabels: Array<{ key: TripTab; label: string }> = [
  { key: "requests", label: "Requests" },
  { key: "upcoming", label: "Upcoming" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
];

const trips = {
  requests: [
    {
      id: "phase6-booking-hold",
      route: "Nukus to Khiva",
      time: "Tomorrow · 09:00",
      status: "Pending driver",
      seat: "Rear left",
      driver: "Matching with approved drivers",
      vehicle: "Seat request",
      priceMinor: 9500000,
      tone: "warning" as const,
      cta: "View request",
    },
  ],
  upcoming: [
    {
      id: "phase6-booking-confirmed",
      route: "Nukus to Urgench",
      time: "Tomorrow, 08:30",
      status: "Confirmed",
      seat: "Front passenger",
      driver: "Azizbek Karimov",
      vehicle: "Chevrolet Cobalt",
      priceMinor: 8500000,
      tone: "success" as const,
      cta: "View trip",
    },
  ],
  active: [
    {
      id: "phase6-booking-confirmed?state=active",
      route: "Nukus to Urgench",
      time: "Arriving 11:30",
      status: "In progress",
      seat: "Front passenger",
      driver: "Azizbek Karimov",
      vehicle: "Chevrolet Cobalt",
      priceMinor: 8500000,
      tone: "info" as const,
      cta: "Track trip",
    },
  ],
  completed: [
    {
      id: "phase6-booking-confirmed?state=completed",
      route: "Nukus to Urgench",
      time: "Completed, 8 Aug",
      status: "Completed",
      seat: "Front passenger",
      driver: "Azizbek Karimov",
      vehicle: "Chevrolet Cobalt",
      priceMinor: 8500000,
      tone: "accent" as const,
      cta: "Review driver",
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
      <ClientHeader title="Trips" subtitle="Requests, rides, and history" />

      <section
        className="-mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4 pb-1.5"
        aria-label="Trip status tabs"
      >
        {tabLabels.map((tab) => (
          <button
            key={tab.key}
            className={[
              "min-h-10 shrink-0 rounded-full px-3 text-[13px] font-black shadow-[var(--shadow-xs)]",
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

      <section aria-label="Client bookings" className="mt-2.5 grid gap-3">
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
                  {activeTab === "requests" ? "Request sent" : trip.driver}
                </div>
                <div className="mt-1 text-xs font-semibold text-[rgb(var(--text-muted))]">
                  {activeTab === "requests"
                    ? `${trip.seat} · waiting for driver confirmation`
                    : `${trip.vehicle} · ${trip.seat}`}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusPill tone="accent">{formatUzs(trip.priceMinor)}</StatusPill>
                  <StatusPill subtle>
                    {activeTab === "completed" ? "Listed price" : "Price per seat"}
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
                  Cancel request
                </Link>
              ) : (
                <Link
                  className="min-h-11 rounded-full bg-[rgb(var(--canvas))] px-4 py-3 text-sm font-black text-[rgb(var(--primary))] no-underline"
                  href="/messages/driver-azizbek"
                >
                  Message driver
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

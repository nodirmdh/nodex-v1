"use client";

import { useState } from "react";
import { AppHeader, Badge, BottomNav, Button, Panel, Timeline, formatUzs } from "@nodex/ui";

const passengers = [
  {
    id: "booking-1",
    passenger: "A. Karimov",
    status: "BOARDING",
    seat: "Front",
    pickup: "Nukus Central Station",
    dropoff: "Urgench Bus Station",
    payment: "Cash",
    totalMinor: 8500000,
  },
  {
    id: "booking-2",
    passenger: "M. Seitov",
    status: "CONFIRMED",
    seat: "1L",
    pickup: "Nukus Central Station",
    dropoff: "Urgench Bus Station",
    payment: "Manual transfer",
    totalMinor: 8500000,
  },
  {
    id: "booking-3",
    passenger: "D. Allamuratov",
    status: "NO_SHOW_CLIENT",
    seat: "1R",
    pickup: "Nukus Market",
    dropoff: "Urgench Bus Station",
    payment: "Cash",
    totalMinor: 8500000,
  },
];

function tone(status: string) {
  if (status === "BOARDING" || status === "IN_PROGRESS") return "info";
  if (status === "NO_SHOW_CLIENT") return "danger";
  if (status === "CONFIRMED") return "success";
  return "warning";
}

export default function PassengersDemo() {
  const [code, setCode] = useState("");
  const boardedCount = passengers.filter((passenger) => passenger.status === "BOARDING").length;
  const noShowCount = passengers.filter(
    (passenger) => passenger.status === "NO_SHOW_CLIENT",
  ).length;
  const pendingCount = passengers.filter((passenger) => passenger.status === "CONFIRMED").length;

  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="Trip operations" subtitle="Boarding, passengers, and trip controls" />
      <div className="space-y-4 px-4">
        <Panel className="space-y-3" aria-label="Driver operation dashboard">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="m-0 text-xl font-black">Nukus to Urgench</h1>
              <p className="m-0 text-sm text-slate-500">08:30 - Chevrolet Cobalt</p>
            </div>
            <Badge tone="warning">BOARDING</Badge>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-sm">
            <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
              <strong>{passengers.length}</strong>
              <span className="block text-xs text-slate-500">Total</span>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
              <strong>{boardedCount}</strong>
              <span className="block text-xs text-slate-500">Boarded</span>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
              <strong>{pendingCount}</strong>
              <span className="block text-xs text-slate-500">Pending</span>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
              <strong>{noShowCount}</strong>
              <span className="block text-xs text-slate-500">No-show</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button">Start boarding</Button>
            <Button type="button" variant="secondary">
              Start trip
            </Button>
            <Button type="button" variant="secondary">
              Complete trip
            </Button>
            <Button type="button" variant="secondary">
              Cancel trip
            </Button>
          </div>
        </Panel>

        <Panel className="space-y-3" aria-label="Boarding code verification">
          <h2 className="m-0 text-base font-bold">Verify boarding code</h2>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Numeric code</span>
            <input
              className="min-h-12 rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-white px-3 text-center text-xl font-bold tracking-[0.2em]"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              value={code}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button disabled={code.length < 4} type="button">
              Confirm boarding
            </Button>
            <Button type="button" variant="secondary">
              Paste code
            </Button>
          </div>
          <p className="m-0 text-sm text-slate-500">
            Wrong codes increase attempts. Locked and used codes are rejected by the API.
          </p>
        </Panel>

        <section aria-label="Driver booking list" className="space-y-3">
          {passengers.map((booking) => (
            <Panel key={booking.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="m-0 text-base font-bold">{booking.passenger}</h2>
                  <p className="m-0 text-sm text-slate-500">
                    {booking.payment} - {formatUzs(booking.totalMinor)}
                  </p>
                </div>
                <Badge tone={tone(booking.status)}>{booking.status}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="block text-slate-500">Seat</span>
                  <strong>{booking.seat}</strong>
                </div>
                <div>
                  <span className="block text-slate-500">Pickup</span>
                  <strong>{booking.pickup}</strong>
                </div>
                <div className="col-span-2">
                  <span className="block text-slate-500">Drop-off</span>
                  <strong>{booking.dropoff}</strong>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="secondary">
                  Board
                </Button>
                <Button type="button" variant="secondary">
                  No-show
                </Button>
              </div>
            </Panel>
          ))}
        </section>

        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Operation history</h2>
          <Timeline
            items={[
              { label: "Boarding started", time: "08:10", active: true },
              { label: "Boarding code verified", time: "08:14", active: true },
              { label: "Client no-show marked", time: "08:20", active: true },
            ]}
          />
        </Panel>
      </div>
      <BottomNav
        items={[
          { label: "Home" },
          { label: "Trips" },
          { label: "Bookings", active: true },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}

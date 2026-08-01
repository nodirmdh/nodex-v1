"use client";

import { useMemo, useState } from "react";
import { AppHeader, Badge, BottomNav, Button, Panel, Timeline } from "@nodex/ui";

type TripStatus = "DRAFT" | "PUBLISHED" | "UNPUBLISHED" | "CANCELLED" | "EXPIRED" | "BLOCKED";

type Trip = {
  id: string;
  route: string;
  vehicle: string;
  departure: string;
  seats: number;
  price: string;
  parcel: boolean;
  status: TripStatus;
};

const trips: Trip[] = [
  {
    id: "trip-published",
    route: "Nukus -> Khiva",
    vehicle: "Chevrolet Tracker",
    departure: "10 Aug, 10:00",
    seats: 4,
    price: "95 000 UZS",
    parcel: true,
    status: "PUBLISHED",
  },
  {
    id: "trip-draft",
    route: "Nukus -> Urgench",
    vehicle: "Chevrolet Tracker",
    departure: "Draft time",
    seats: 3,
    price: "85 000 UZS",
    parcel: true,
    status: "DRAFT",
  },
  {
    id: "trip-unpublished",
    route: "Nukus -> Bukhara",
    vehicle: "Chevrolet Tracker",
    departure: "12 Aug, 09:00",
    seats: 4,
    price: "180 000 UZS",
    parcel: true,
    status: "UNPUBLISHED",
  },
];

function statusTone(status: TripStatus) {
  if (status === "PUBLISHED") return "success";
  if (status === "CANCELLED" || status === "EXPIRED" || status === "BLOCKED") return "danger";
  if (status === "UNPUBLISHED") return "warning";
  return "info";
}

export default function DriverTripsPage() {
  const [selected, setSelected] = useState<Trip>(trips[0]!);
  const [status, setStatus] = useState<"ALL" | TripStatus>("ALL");
  const visibleTrips = useMemo(
    () => (status === "ALL" ? trips : trips.filter((trip) => trip.status === status)),
    [status],
  );

  return (
    <main className="nodex-app mobile-shell pb-24">
      <AppHeader title="My trips" subtitle="Draft, publish, unpublish, and cancel routes" />
      <div className="space-y-4 px-4">
        <Panel className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="m-0 text-lg font-black">Trips</h1>
              <div className="text-sm text-slate-500">
                Approved vehicle supply for intercity routes.
              </div>
            </div>
            <Button>Create trip</Button>
          </div>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Status filter</span>
            <select
              className="min-h-10 rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3"
              value={status}
              onChange={(event) => setStatus(event.target.value as "ALL" | TripStatus)}
            >
              <option value="ALL">All trips</option>
              <option value="DRAFT">Drafts</option>
              <option value="PUBLISHED">Published</option>
              <option value="UNPUBLISHED">Unpublished</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </label>
          <div className="grid gap-2" aria-label="Driver trip list">
            {visibleTrips.map((trip) => (
              <button
                key={trip.id}
                className="rounded-[var(--radius-md)] border border-[rgb(var(--border))] p-3 text-left"
                onClick={() => setSelected(trip)}
                type="button"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold">{trip.route}</div>
                    <div className="text-sm text-slate-500">{trip.departure}</div>
                  </div>
                  <Badge tone={statusTone(trip.status)}>{trip.status}</Badge>
                </div>
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="space-y-3" aria-label="Create trip wizard">
          <h2 className="m-0 text-base font-bold">Create trip wizard</h2>
          <div className="grid gap-2 text-sm">
            {[
              "1. Route and departure time",
              "2. Approved vehicle and capacity",
              "3. Pickup, dropoff, and intermediate stops",
              "4. Seat price, whole-car price, parcels, and luggage",
              "5. Review validation and publish",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3"
              >
                {item}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary">Save draft</Button>
            <Button>Publish</Button>
          </div>
        </Panel>

        <Panel className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="m-0 text-base font-bold">Trip details</h2>
              <div className="text-sm text-slate-500">{selected.route}</div>
            </div>
            <Badge tone={statusTone(selected.status)}>{selected.status}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
              <span className="block text-slate-500">Vehicle</span>
              <strong>{selected.vehicle}</strong>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
              <span className="block text-slate-500">Seats</span>
              <strong>{selected.seats}</strong>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
              <span className="block text-slate-500">Price</span>
              <strong>{selected.price}</strong>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
              <span className="block text-slate-500">Parcels</span>
              <strong>{selected.parcel ? "Supported" : "No"}</strong>
            </div>
          </div>
          <div className="grid gap-2">
            {selected.status === "DRAFT" && <Button>Publish trip</Button>}
            {selected.status === "PUBLISHED" && <Button variant="secondary">Unpublish</Button>}
            {selected.status !== "CANCELLED" && <Button variant="secondary">Cancel trip</Button>}
          </div>
        </Panel>

        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Trip history</h2>
          <Timeline
            items={[
              { label: "Trip draft created", time: "Today", active: true },
              { label: "Publication validation", time: selected.status },
              { label: "Latest driver action", time: selected.status },
            ]}
          />
        </Panel>
      </div>
      <BottomNav
        items={[
          { label: "Verify" },
          { label: "Vehicles" },
          { label: "Trips", active: true },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}

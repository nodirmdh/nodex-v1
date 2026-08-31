"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "../admin-shell";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";
type TripStatus = "Published" | "Boarding" | "In progress" | "Completed" | "Cancelled" | "Blocked";

type TripRow = {
  id: string;
  route: string;
  departure: string;
  driver: string;
  vehicle: string;
  seatMap: string;
  requests: number;
  parcels: number;
  price: string;
  status: TripStatus;
  attention: string;
  timeline: Array<{ label: string; time: string }>;
};

const trips: TripRow[] = [
  {
    id: "trip-boarding",
    route: "Nukus → Urgench",
    departure: "Today · 18:30 UTC",
    driver: "Azizbek Karimov",
    vehicle: "Chevrolet Cobalt · 95 A 184 AA",
    seatMap: "3 requested · 1 open",
    requests: 6,
    parcels: 2,
    price: "85 000 UZS",
    status: "Boarding",
    attention: "Boarding started; one passenger request still pending driver response",
    timeline: [
      { label: "Trip published", time: "08:12" },
      { label: "Seat requests received", time: "10:34" },
      { label: "Boarding window opened", time: "18:00" },
    ],
  },
  {
    id: "trip-active",
    route: "Nukus → Khiva",
    departure: "Today · 17:20 UTC",
    driver: "Madina Yusupova",
    vehicle: "Chevrolet Tracker · 95 B 442 BA",
    seatMap: "3 onboard · 0 open",
    requests: 4,
    parcels: 1,
    price: "95 000 UZS",
    status: "In progress",
    attention: "Active trip; parcel handoff expected at destination",
    timeline: [
      { label: "Boarding completed", time: "17:18" },
      { label: "Trip moved to in progress", time: "17:22" },
      { label: "Destination ETA updated", time: "19:58" },
    ],
  },
  {
    id: "trip-published",
    route: "Tashkent → Samarkand",
    departure: "Tomorrow · 07:40 UTC",
    driver: "Sherzod Rakhimov",
    vehicle: "Kia K5 · 01 K 731 KA",
    seatMap: "2 requested · 2 open",
    requests: 3,
    parcels: 0,
    price: "120 000 UZS",
    status: "Published",
    attention: "Normal demand and approved vehicle",
    timeline: [
      { label: "Driver created trip", time: "Yesterday" },
      { label: "Publication validation passed", time: "Yesterday" },
      { label: "Search listing visible", time: "Today" },
    ],
  },
  {
    id: "trip-blocked",
    route: "Nukus → Bukhara",
    departure: "Tomorrow · 09:00 UTC",
    driver: "Azizbek Karimov",
    vehicle: "Chevrolet Cobalt · 95 A 184 AA",
    seatMap: "0 requested · 4 open",
    requests: 0,
    parcels: 0,
    price: "180 000 UZS",
    status: "Blocked",
    attention: "Blocked by operations pending route review",
    timeline: [
      { label: "Trip published", time: "13:18" },
      { label: "Route issue detected", time: "13:31" },
      { label: "Blocked by operations", time: "13:34" },
    ],
  },
];

function statusTone(status: TripStatus): BadgeTone {
  if (status === "Published" || status === "Completed") return "success";
  if (status === "Boarding" || status === "In progress") return "info";
  if (status === "Blocked" || status === "Cancelled") return "danger";
  return "neutral";
}

export default function AdminTripsPage() {
  const [selectedId, setSelectedId] = useState(trips[0]!.id);
  const selected = useMemo(
    () => trips.find((trip) => trip.id === selectedId) ?? trips[0]!,
    [selectedId],
  );
  const [actionNotice, setActionNotice] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("state") === "active") {
      setSelectedId("trip-active");
    }
  }, []);

  return (
    <main className="p-5">
      <AdminPageHeader
        title="Trip supply"
        subtitle="Monitor published trips, boarding windows, active journeys, seat requests, parcel load, and operations-only interventions."
        actions={
          <>
            <button
              className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black"
              type="button"
              onClick={() => setActionNotice("Trip export queued for local QA.")}
            >
              Export trips
            </button>
            <button
              className="rounded-[10px] bg-[rgb(var(--primary))] px-3 py-2 text-sm font-black text-[rgb(var(--primary-foreground))]"
              type="button"
              onClick={() => {
                setSelectedId("trip-active");
                setActionNotice("Live board opened on active trip.");
              }}
            >
              Open live board
            </button>
          </>
        }
      />

      <div className="grid gap-4 min-[1380px]:grid-cols-[minmax(0,1fr)_470px]">
        <AdminPanel className="overflow-hidden" label="Admin trips table">
          <div className="grid gap-3 border-b border-[rgb(var(--border))] p-4 lg:grid-cols-[1fr_auto]">
            <div className="flex flex-wrap gap-2">
              {[
                ["Boarding", "1"],
                ["Active", "1"],
                ["Published", "34"],
                ["Pending requests", "13"],
                ["Parcel trips", "18"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-[108px] rounded-[12px] bg-[rgb(var(--surface-muted))] p-3"
                >
                  <div className="text-lg font-black">{value}</div>
                  <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">{label}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <select className="min-h-10 rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm">
                <option>All statuses</option>
                <option>Boarding</option>
                <option>In progress</option>
                <option>Published</option>
                <option>Blocked</option>
              </select>
              <input
                className="min-h-10 w-[240px] rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm outline-none"
                placeholder="Route, driver, plate"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] font-black uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Trip</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Driver</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Seats</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Requests</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Parcels</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((trip) => (
                  <tr
                    key={trip.id}
                    className={[
                      "cursor-pointer border-b border-[rgb(var(--border))] transition hover:bg-[rgb(var(--surface-muted))]",
                      selected.id === trip.id ? "bg-[rgb(var(--info-soft))]" : "",
                    ].join(" ")}
                    onClick={() => setSelectedId(trip.id)}
                  >
                    <td className="px-4 py-3">
                      <strong>{trip.route}</strong>
                      <span className="block text-xs font-semibold text-[rgb(var(--text-muted))]">
                        {trip.departure} · {trip.price}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{trip.driver}</td>
                    <td className="px-4 py-3">{trip.seatMap}</td>
                    <td className="px-4 py-3 font-black">{trip.requests}</td>
                    <td className="px-4 py-3 font-black">{trip.parcels}</td>
                    <td className="px-4 py-3">
                      <AdminStatusBadge tone={statusTone(trip.status)}>
                        {trip.status}
                      </AdminStatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <AdminPanel className="overflow-hidden" label="Trip operation detail">
          <div className="border-b border-[rgb(var(--border))] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-xl font-black">{selected.route}</h2>
                <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                  {selected.departure}
                </p>
              </div>
              <AdminStatusBadge tone={statusTone(selected.status)}>
                {selected.status}
              </AdminStatusBadge>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <section>
              <h3 className="m-0 mb-2 text-sm font-black">Rewards review</h3>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-[10px] bg-[rgb(var(--surface-muted))] p-3">
                  <strong>4</strong>
                  <span className="block text-xs text-[rgb(var(--text-muted))]">
                    Pending review
                  </span>
                </div>
                <div className="rounded-[10px] bg-[rgb(var(--success-soft))] p-3">
                  <strong>128</strong>
                  <span className="block text-xs text-[rgb(var(--text-muted))]">Auto approved</span>
                </div>
                <div className="rounded-[10px] bg-[rgb(var(--warning-soft))] p-3">
                  <strong>2</strong>
                  <span className="block text-xs text-[rgb(var(--text-muted))]">High risk</span>
                </div>
              </div>
              <p className="m-0 mt-2 text-xs font-semibold text-[rgb(var(--text-muted))]">
                Rewards are gated by trip completion, start PIN, GPS movement, duplicate checks, and
                referral cycle checks.
              </p>
            </section>
            <section>
              <h3 className="m-0 mb-2 text-sm font-black">Live operations</h3>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-[10px] bg-[rgb(var(--surface-muted))] p-3">
                  <strong>{selected.requests}</strong>
                  <span className="block text-xs text-[rgb(var(--text-muted))]">Seat requests</span>
                </div>
                <div className="rounded-[10px] bg-[rgb(var(--surface-muted))] p-3">
                  <strong>{selected.parcels}</strong>
                  <span className="block text-xs text-[rgb(var(--text-muted))]">Parcels</span>
                </div>
                <div className="rounded-[10px] bg-[rgb(var(--surface-muted))] p-3">
                  <strong>{selected.price}</strong>
                  <span className="block text-xs text-[rgb(var(--text-muted))]">Listed fare</span>
                </div>
              </div>
            </section>

            <section className="rounded-[12px] border border-[rgb(var(--border))] p-3">
              <h3 className="m-0 mb-2 text-sm font-black">Driver and vehicle</h3>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-[rgb(var(--text-muted))]">Driver</span>
                  <strong>{selected.driver}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[rgb(var(--text-muted))]">Vehicle</span>
                  <strong className="text-right">{selected.vehicle}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[rgb(var(--text-muted))]">Seats</span>
                  <strong>{selected.seatMap}</strong>
                </div>
              </div>
            </section>

            <section>
              <h3 className="m-0 mb-2 text-sm font-black">Moderation</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black"
                  type="button"
                  onClick={() => {
                    window.location.href = "/drivers";
                  }}
                >
                  Open driver
                </button>
                <button
                  className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black"
                  type="button"
                  onClick={() => {
                    window.location.href = "/vehicles";
                  }}
                >
                  Inspect vehicle
                </button>
                <button
                  className="rounded-[10px] border border-[rgb(var(--warning))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black text-[rgb(var(--warning))]"
                  type="button"
                  onClick={() => setActionNotice(`${selected.route} cancellation review opened.`)}
                >
                  Cancel trip
                </button>
                <button
                  className="rounded-[10px] border border-[rgb(var(--destructive))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black text-[rgb(var(--destructive))]"
                  type="button"
                  onClick={() =>
                    setActionNotice(`${selected.route} block action recorded for review.`)
                  }
                >
                  Block
                </button>
              </div>
            </section>

            {actionNotice ? (
              <section className="rounded-[12px] bg-[rgb(var(--info-soft))] p-3 text-sm font-black text-[rgb(var(--info))]">
                {actionNotice}
              </section>
            ) : null}

            <section className="rounded-[12px] border border-[rgb(var(--border))] p-3">
              <h3 className="m-0 mb-2 text-sm font-black">Trip core history</h3>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-[rgb(var(--text-muted))]">Start PIN</span>
                  <strong>Verified per passenger before normal start</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[rgb(var(--text-muted))]">Location history</span>
                  <strong>Read-only route points</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[rgb(var(--text-muted))]">ETA</span>
                  <strong>No route provider connected</strong>
                </div>
              </div>
            </section>
            <section>
              <h3 className="m-0 mb-2 text-sm font-black">Timeline</h3>
              <div className="grid gap-2">
                {selected.timeline.map((event) => (
                  <div
                    key={`${event.time}-${event.label}`}
                    className="grid grid-cols-[64px_1fr] gap-3 text-sm"
                  >
                    <span className="font-black text-[rgb(var(--text-muted))]">{event.time}</span>
                    <span>{event.label}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </AdminPanel>
      </div>
    </main>
  );
}

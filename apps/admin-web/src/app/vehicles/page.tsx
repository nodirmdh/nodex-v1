"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "../admin-shell";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

type VehicleStatus = "Submitted" | "In review" | "Changes requested" | "Approved" | "Suspended";

type VehicleRow = {
  id: string;
  vehicle: string;
  plate: string;
  driver: string;
  region: string;
  seats: string;
  documents: string;
  status: VehicleStatus;
  priority: string;
  updated: string;
  photos: string[];
  timeline: Array<{ label: string; time: string }>;
};

const vehicles: VehicleRow[] = [
  {
    id: "vehicle-cobalt",
    vehicle: "Chevrolet Cobalt",
    plate: "95 A 184 AA",
    driver: "Azizbek Karimov",
    region: "Nukus",
    seats: "4 passenger seats",
    documents: "3 of 3 checked",
    status: "In review",
    priority: "Plate and interior photo need second look",
    updated: "11:42 UTC",
    photos: ["Front exterior", "Rear exterior", "Cabin", "Plate close-up"],
    timeline: [
      { label: "Vehicle submitted", time: "09:18" },
      { label: "Driver already approved", time: "09:21" },
      { label: "Documents matched plate", time: "10:04" },
      { label: "Cabin photo queued for review", time: "11:42" },
    ],
  },
  {
    id: "vehicle-tracker",
    vehicle: "Chevrolet Tracker",
    plate: "95 B 442 BA",
    driver: "Madina Yusupova",
    region: "Urgench",
    seats: "3 passenger seats",
    documents: "3 of 3 checked",
    status: "Approved",
    priority: "Ready for trip publishing",
    updated: "10:15 UTC",
    photos: ["Front exterior", "Rear exterior", "Interior", "Insurance"],
    timeline: [
      { label: "Vehicle submitted", time: "08:10" },
      { label: "Registration verified", time: "08:44" },
      { label: "Approved by operations", time: "10:15" },
    ],
  },
  {
    id: "vehicle-k5",
    vehicle: "Kia K5",
    plate: "01 K 731 KA",
    driver: "Sherzod Rakhimov",
    region: "Tashkent",
    seats: "4 passenger seats",
    documents: "2 of 3 checked",
    status: "Changes requested",
    priority: "Insurance document is unreadable",
    updated: "09:58 UTC",
    photos: ["Front exterior", "Cabin", "Plate close-up"],
    timeline: [
      { label: "Vehicle submitted", time: "07:40" },
      { label: "Insurance image failed review", time: "09:58" },
      { label: "Correction request prepared", time: "10:01" },
    ],
  },
];

function statusTone(status: VehicleStatus): BadgeTone {
  if (status === "Approved") return "success";
  if (status === "Suspended") return "danger";
  if (status === "Changes requested" || status === "In review") return "warning";
  return "info";
}

export default function AdminVehiclesPage() {
  const [reviewMode, setReviewMode] = useState(false);
  const [selectedId, setSelectedId] = useState(vehicles[0]!.id);
  const selected = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedId) ?? vehicles[0]!,
    [selectedId],
  );

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("review") === "1") {
      setReviewMode(true);
      setSelectedId("vehicle-k5");
    }
  }, []);

  return (
    <main className="p-5">
      <AdminPageHeader
        title="Vehicle moderation"
        subtitle="Review real vehicle documents, cabin evidence, seat capacity, and approval risk before drivers publish trips."
        actions={
          <>
            <button className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black">
              Export queue
            </button>
            <button className="rounded-[10px] bg-[rgb(var(--primary))] px-3 py-2 text-sm font-black text-[rgb(var(--primary-foreground))]">
              Review next
            </button>
          </>
        }
      />

      <div className="grid gap-4 min-[1380px]:grid-cols-[minmax(0,1fr)_460px]">
        <AdminPanel className="overflow-hidden" label="Vehicle moderation queue">
          <div className="grid gap-3 border-b border-[rgb(var(--border))] p-4 lg:grid-cols-[1fr_auto]">
            <div className="flex flex-wrap gap-2">
              {[
                ["In review", "1"],
                ["Approved", "1"],
                ["Corrections", "1"],
                ["Avg review", "18m"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-[112px] rounded-[12px] bg-[rgb(var(--surface-muted))] p-3"
                >
                  <div className="text-lg font-black">{value}</div>
                  <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">{label}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-start gap-2">
              <input
                className="min-h-10 w-[260px] rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm outline-none"
                placeholder="Search plate, driver, city"
              />
              <select className="min-h-10 rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm">
                <option>All statuses</option>
                <option>In review</option>
                <option>Changes requested</option>
                <option>Approved</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] font-black uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Vehicle</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Driver</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Capacity</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Documents</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Status</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle) => (
                  <tr
                    key={vehicle.id}
                    aria-selected={selected.id === vehicle.id}
                    className={[
                      "cursor-pointer border-b border-[rgb(var(--border))] transition hover:bg-[rgb(var(--surface-muted))]",
                      selected.id === vehicle.id
                        ? "bg-[rgb(var(--info-soft))]"
                        : "bg-[rgb(var(--surface))]",
                    ].join(" ")}
                    onClick={() => setSelectedId(vehicle.id)}
                  >
                    <td className="px-4 py-3">
                      <strong>{vehicle.vehicle}</strong>
                      <span className="block text-xs font-semibold text-[rgb(var(--text-muted))]">
                        {vehicle.plate} · {vehicle.region}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{vehicle.driver}</td>
                    <td className="px-4 py-3">{vehicle.seats}</td>
                    <td className="px-4 py-3">{vehicle.documents}</td>
                    <td className="px-4 py-3">
                      <AdminStatusBadge tone={statusTone(vehicle.status)}>
                        {vehicle.status}
                      </AdminStatusBadge>
                    </td>
                    <td className="px-4 py-3 text-[rgb(var(--text-muted))]">{vehicle.updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <AdminPanel className="overflow-hidden" label="Vehicle detail">
          <div className="border-b border-[rgb(var(--border))] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-xl font-black">{selected.vehicle}</h2>
                <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                  {selected.plate} · {selected.driver}
                </p>
              </div>
              <AdminStatusBadge tone={statusTone(selected.status)}>
                {selected.status}
              </AdminStatusBadge>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-[10px] bg-[rgb(var(--surface-muted))] p-3">
                <strong>{selected.region}</strong>
                <span className="block text-xs text-[rgb(var(--text-muted))]">Operating city</span>
              </div>
              <div className="rounded-[10px] bg-[rgb(var(--surface-muted))] p-3">
                <strong>{selected.seats.split(" ")[0]}</strong>
                <span className="block text-xs text-[rgb(var(--text-muted))]">Seats</span>
              </div>
              <div className="rounded-[10px] bg-[rgb(var(--surface-muted))] p-3">
                <strong>Approved</strong>
                <span className="block text-xs text-[rgb(var(--text-muted))]">Driver</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <section className="sticky bottom-0 rounded-[12px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 shadow-[var(--shadow-xs)]">
              <h3 className="m-0 mb-2 text-sm font-black">Documents</h3>
              <div className="grid gap-2">
                {["Registration certificate", "Insurance policy", "Technical inspection"].map(
                  (item) => (
                    <div
                      key={item}
                      className="flex min-h-11 items-center justify-between rounded-[10px] border border-[rgb(var(--border))] px-3 text-sm"
                    >
                      <span>{item}</span>
                      <AdminStatusBadge
                        tone={
                          item === "Insurance policy" && selected.id === "vehicle-k5"
                            ? "warning"
                            : "success"
                        }
                      >
                        {item === "Insurance policy" && selected.id === "vehicle-k5"
                          ? "Needs replacement"
                          : "Verified"}
                      </AdminStatusBadge>
                    </div>
                  ),
                )}
              </div>
            </section>

            <section>
              <h3 className="m-0 mb-2 text-sm font-black">Photo gallery</h3>
              <div className="grid grid-cols-2 gap-2">
                {selected.photos.map((photo) => (
                  <div
                    key={photo}
                    className="min-h-20 rounded-[12px] border border-[rgb(var(--border))] bg-[linear-gradient(135deg,rgb(var(--surface-muted)),rgb(var(--surface)))] p-3 text-sm font-bold"
                  >
                    {photo}
                    <span className="mt-5 block text-xs font-semibold text-[rgb(var(--text-muted))]">
                      Evidence image
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="m-0 mb-2 text-sm font-black">Decision</h3>
              <div className="grid gap-2">
                <textarea
                  className="min-h-20 rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] p-3 text-sm outline-none"
                  defaultValue={
                    reviewMode
                      ? "Insurance image is blurred. Request a readable replacement before approval."
                      : ""
                  }
                  placeholder="Add required reason for approval, correction, rejection, or suspension."
                />
                <div className="grid grid-cols-2 gap-2">
                  <button className="rounded-[10px] bg-[rgb(var(--primary))] px-3 py-2 text-sm font-black text-[rgb(var(--primary-foreground))]">
                    Approve
                  </button>
                  <button className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black">
                    Request correction
                  </button>
                  <button className="rounded-[10px] border border-[rgb(var(--warning))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black text-[rgb(var(--warning))]">
                    Reject
                  </button>
                  <button className="rounded-[10px] border border-[rgb(var(--destructive))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black text-[rgb(var(--destructive))]">
                    Suspend
                  </button>
                </div>
              </div>
            </section>

            <section>
              <h3 className="m-0 mb-2 text-sm font-black">Review history</h3>
              <div className="grid gap-2">
                {selected.timeline.map((event) => (
                  <div
                    key={`${event.time}-${event.label}`}
                    className="grid grid-cols-[48px_1fr] gap-3 text-sm"
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

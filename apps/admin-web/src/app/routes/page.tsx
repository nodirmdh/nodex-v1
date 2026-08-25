"use client";

import { useMemo, useState } from "react";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "../admin-shell";

type RouteRow = {
  id: string;
  name: string;
  corridor: string;
  distance: string;
  duration: string;
  pickupPoints: string[];
  activeTrips: number;
  pendingRequests: number;
  parcelLoad: string;
  status: "Active" | "Paused";
  attention: string;
};

const routes: RouteRow[] = [
  {
    id: "nukus-urgench",
    name: "Nukus → Urgench",
    corridor: "Karakalpakstan · Khorezm",
    distance: "170 km",
    duration: "3h 05m",
    pickupPoints: ["Nukus central station", "Turtkul turnoff", "Urgench railway station"],
    activeTrips: 18,
    pendingRequests: 42,
    parcelLoad: "High",
    status: "Active",
    attention: "Healthy supply, monitor evening seat request spike",
  },
  {
    id: "nukus-khiva",
    name: "Nukus → Khiva",
    corridor: "Karakalpakstan · Khorezm",
    distance: "190 km",
    duration: "3h 30m",
    pickupPoints: ["Nukus central station", "Beruniy market", "Khiva north gate"],
    activeTrips: 9,
    pendingRequests: 16,
    parcelLoad: "Medium",
    status: "Active",
    attention: "One pickup point needs coordinates confirmation",
  },
  {
    id: "tashkent-samarkand",
    name: "Tashkent → Samarkand",
    corridor: "Tashkent · Samarkand",
    distance: "305 km",
    duration: "4h 20m",
    pickupPoints: ["Tashkent bus terminal", "Jizzakh checkpoint", "Samarkand Registan lot"],
    activeTrips: 12,
    pendingRequests: 28,
    parcelLoad: "Medium",
    status: "Active",
    attention: "Weekend supply balanced",
  },
];

export default function AdminRoutesPage() {
  const [selectedId, setSelectedId] = useState(routes[0]!.id);
  const selected = useMemo(
    () => routes.find((route) => route.id === selectedId) ?? routes[0]!,
    [selectedId],
  );

  return (
    <main className="p-5">
      <AdminPageHeader
        title="Route directory"
        subtitle="Maintain regional corridors, city pairs, pickup points, and operational route health."
        actions={
          <>
            <button className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black">
              Add pickup point
            </button>
            <button className="rounded-[10px] bg-[rgb(var(--primary))] px-3 py-2 text-sm font-black text-[rgb(var(--primary-foreground))]">
              Create route
            </button>
          </>
        }
      />

      <div className="grid gap-4 min-[1380px]:grid-cols-[minmax(0,1fr)_450px]">
        <AdminPanel className="overflow-hidden" label="Route directory table">
          <div className="grid gap-3 border-b border-[rgb(var(--border))] p-4 lg:grid-cols-[1fr_auto]">
            <div className="flex flex-wrap gap-2">
              {[
                ["Active routes", "39"],
                ["Live trips", "124"],
                ["Pickup points", "116"],
                ["Route alerts", "2"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-[118px] rounded-[12px] bg-[rgb(var(--surface-muted))] p-3"
                >
                  <div className="text-lg font-black">{value}</div>
                  <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">{label}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                className="min-h-10 w-[240px] rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm outline-none"
                placeholder="Search city or corridor"
              />
              <select className="min-h-10 rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm">
                <option>All regions</option>
                <option>Karakalpakstan</option>
                <option>Khorezm</option>
                <option>Tashkent</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] font-black uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Route</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Distance</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Trips</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Requests</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Parcels</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {routes.map((route) => (
                  <tr
                    key={route.id}
                    className={[
                      "cursor-pointer border-b border-[rgb(var(--border))] transition hover:bg-[rgb(var(--surface-muted))]",
                      selected.id === route.id ? "bg-[rgb(var(--info-soft))]" : "",
                    ].join(" ")}
                    onClick={() => setSelectedId(route.id)}
                  >
                    <td className="px-4 py-3">
                      <strong>{route.name}</strong>
                      <span className="block text-xs font-semibold text-[rgb(var(--text-muted))]">
                        {route.corridor}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {route.distance}
                      <span className="block text-xs text-[rgb(var(--text-muted))]">
                        {route.duration}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-black">{route.activeTrips}</td>
                    <td className="px-4 py-3 font-black">{route.pendingRequests}</td>
                    <td className="px-4 py-3">{route.parcelLoad}</td>
                    <td className="px-4 py-3">
                      <AdminStatusBadge tone={route.status === "Active" ? "success" : "warning"}>
                        {route.status}
                      </AdminStatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <AdminPanel className="overflow-hidden" label="Route detail">
          <div className="border-b border-[rgb(var(--border))] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-xl font-black">{selected.name}</h2>
                <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                  {selected.corridor}
                </p>
              </div>
              <AdminStatusBadge tone="success">{selected.status}</AdminStatusBadge>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <section>
              <h3 className="m-0 mb-2 text-sm font-black">Operational load</h3>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-[10px] bg-[rgb(var(--surface-muted))] p-3">
                  <strong>{selected.activeTrips}</strong>
                  <span className="block text-xs text-[rgb(var(--text-muted))]">Active trips</span>
                </div>
                <div className="rounded-[10px] bg-[rgb(var(--surface-muted))] p-3">
                  <strong>{selected.pendingRequests}</strong>
                  <span className="block text-xs text-[rgb(var(--text-muted))]">Seat requests</span>
                </div>
                <div className="rounded-[10px] bg-[rgb(var(--surface-muted))] p-3">
                  <strong>{selected.parcelLoad}</strong>
                  <span className="block text-xs text-[rgb(var(--text-muted))]">Parcel load</span>
                </div>
              </div>
            </section>

            <section>
              <h3 className="m-0 mb-2 text-sm font-black">Pickup points</h3>
              <div className="mb-3 rounded-[12px] bg-[rgb(var(--surface-muted))] p-3">
                <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2 text-xs font-black">
                  <span>{selected.name.split(" → ")[0]}</span>
                  <span className="h-1 rounded-full bg-[rgb(var(--primary))]" />
                  <span>pickup</span>
                  <span className="h-1 rounded-full bg-[rgb(var(--primary))]" />
                  <span>{selected.name.split(" → ")[1]}</span>
                </div>
                <div className="mt-2 flex justify-between text-xs font-semibold text-[rgb(var(--text-muted))]">
                  <span>{selected.activeTrips} trips</span>
                  <span>{selected.pendingRequests} requests</span>
                </div>
              </div>
              <div className="grid gap-2">
                {selected.pickupPoints.map((point, index) => (
                  <div
                    key={point}
                    className="grid grid-cols-[28px_1fr_auto] items-center gap-3 rounded-[10px] border border-[rgb(var(--border))] px-3 py-2 text-sm"
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-[rgb(var(--surface-muted))] text-xs font-black">
                      {index + 1}
                    </span>
                    <span className="font-semibold">{point}</span>
                    <AdminStatusBadge tone="success">Active</AdminStatusBadge>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="m-0 mb-2 text-sm font-black">Route controls</h3>
              <div className="grid grid-cols-2 gap-2">
                <button className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black">
                  Edit route
                </button>
                <button className="rounded-[10px] border border-[rgb(var(--warning))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black text-[rgb(var(--warning))]">
                  Pause route
                </button>
              </div>
            </section>
          </div>
        </AdminPanel>
      </div>
    </main>
  );
}

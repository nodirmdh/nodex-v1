"use client";

import { useMemo, useState } from "react";
import { formatUzs } from "@nodex/ui";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "../admin-shell";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";
type ParcelStatus =
  | "Ready for pickup"
  | "Accepted by driver"
  | "In transit"
  | "Delivered"
  | "Issue opened";

type ParcelRow = {
  id: string;
  title: string;
  route: string;
  trip: string;
  sender: string;
  receiver: string;
  driver: string;
  size: string;
  priceMinor: number;
  handoff: string;
  status: ParcelStatus;
  attention: string;
  timeline: Array<{ label: string; time: string }>;
};

const parcels: ParcelRow[] = [
  {
    id: "parcel-documents",
    title: "Documents envelope",
    route: "Nukus → Urgench",
    trip: "Today · 18:30 UTC",
    sender: "Gulnora Ergasheva",
    receiver: "Bekzod Ergashev",
    driver: "Azizbek Karimov",
    size: "Small · documents",
    priceMinor: 3000000,
    handoff: "Pickup code issued",
    status: "Ready for pickup",
    attention: "Sender handoff pending before boarding closes",
    timeline: [
      { label: "Parcel request created", time: "09:12" },
      { label: "Driver accepted parcel", time: "09:24" },
      { label: "Pickup code issued to sender", time: "09:25" },
    ],
  },
  {
    id: "parcel-electronics",
    title: "Small electronics",
    route: "Nukus → Khiva",
    trip: "Today · 17:20 UTC",
    sender: "Rustam Seitov",
    receiver: "Malika Seitova",
    driver: "Madina Yusupova",
    size: "Small · fragile",
    priceMinor: 3500000,
    handoff: "In driver custody",
    status: "In transit",
    attention: "Destination handoff expected in 45 minutes",
    timeline: [
      { label: "Parcel accepted", time: "10:18" },
      { label: "Pickup handoff verified", time: "16:58" },
      { label: "Trip moved to in progress", time: "17:22" },
    ],
  },
  {
    id: "parcel-issue",
    title: "Clothing package",
    route: "Tashkent → Samarkand",
    trip: "Yesterday · 19:10 UTC",
    sender: "Kamola Rakhimova",
    receiver: "Sardor Rakhimov",
    driver: "Sherzod Rakhimov",
    size: "Medium · soft parcel",
    priceMinor: 4000000,
    handoff: "Receiver disputed condition",
    status: "Issue opened",
    attention: "Support note attached after delivery dispute",
    timeline: [
      { label: "Parcel delivered", time: "Yesterday" },
      { label: "Receiver reported condition issue", time: "20:44" },
      { label: "Admin review opened", time: "20:50" },
    ],
  },
];

function statusTone(status: ParcelStatus): BadgeTone {
  if (status === "Delivered") return "success";
  if (status === "Ready for pickup" || status === "Accepted by driver" || status === "In transit") {
    return "info";
  }
  if (status === "Issue opened") return "danger";
  return "neutral";
}

export default function AdminParcelsPage() {
  const [selectedId, setSelectedId] = useState(parcels[0]!.id);
  const selected = useMemo(
    () => parcels.find((parcel) => parcel.id === selectedId) ?? parcels[0]!,
    [selectedId],
  );

  return (
    <main className="p-5">
      <AdminPageHeader
        title="Parcels"
        subtitle="Track route-linked parcels, custody handoffs, driver acceptance, delivery issues, and support context."
        actions={
          <>
            <button className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black">
              Export parcels
            </button>
            <button className="rounded-[10px] bg-[rgb(var(--primary))] px-3 py-2 text-sm font-black text-[rgb(var(--primary-foreground))]">
              Open issues
            </button>
          </>
        }
      />

      <div className="grid gap-4 min-[1380px]:grid-cols-[minmax(0,1fr)_460px]">
        <AdminPanel className="overflow-hidden">
          <div className="grid gap-3 border-b border-[rgb(var(--border))] p-4 lg:grid-cols-[1fr_auto]">
            <div className="flex flex-wrap gap-2">
              {[
                ["Active parcels", "31"],
                ["Pickup due", "8"],
                ["In transit", "12"],
                ["Open issues", "1"],
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
            <div className="flex flex-wrap gap-2">
              <select className="min-h-10 rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm">
                <option>All parcel states</option>
                <option>Ready for pickup</option>
                <option>In transit</option>
                <option>Issue opened</option>
              </select>
              <input
                className="min-h-10 w-[240px] rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm outline-none"
                placeholder="Parcel, route, driver"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm" aria-label="Admin parcel list">
              <thead>
                <tr className="text-left text-[11px] font-black uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Parcel</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Route</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Price</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Handoff</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {parcels.map((parcel) => (
                  <tr
                    key={parcel.id}
                    className={[
                      "cursor-pointer border-b border-[rgb(var(--border))] transition hover:bg-[rgb(var(--surface-muted))]",
                      selected.id === parcel.id ? "bg-[rgb(var(--info-soft))]" : "",
                    ].join(" ")}
                    onClick={() => setSelectedId(parcel.id)}
                  >
                    <td className="px-4 py-3">
                      <strong>{parcel.title}</strong>
                      <span className="block text-xs font-semibold text-[rgb(var(--text-muted))]">
                        {parcel.sender} → {parcel.receiver}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {parcel.route}
                      <span className="block text-xs text-[rgb(var(--text-muted))]">
                        {parcel.trip}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatUzs(parcel.priceMinor)}</td>
                    <td className="px-4 py-3">{parcel.handoff}</td>
                    <td className="px-4 py-3">
                      <AdminStatusBadge tone={statusTone(parcel.status)}>
                        {parcel.status}
                      </AdminStatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <AdminPanel className="overflow-hidden" label="Parcel moderation detail">
          <div className="border-b border-[rgb(var(--border))] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-xl font-black">{selected.title}</h2>
                <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                  {selected.route} · {selected.trip}
                </p>
              </div>
              <AdminStatusBadge tone={statusTone(selected.status)}>
                {selected.status}
              </AdminStatusBadge>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <section className="rounded-[12px] border border-[rgb(var(--border))] p-3">
              <h3 className="m-0 mb-2 text-sm font-black">Handoff context</h3>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-[rgb(var(--text-muted))]">Sender</span>
                  <strong>{selected.sender}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[rgb(var(--text-muted))]">Receiver</span>
                  <strong>{selected.receiver}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[rgb(var(--text-muted))]">Driver</span>
                  <strong>{selected.driver}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[rgb(var(--text-muted))]">Custody</span>
                  <strong className="text-right">{selected.handoff}</strong>
                </div>
              </div>
            </section>

            <section>
              <h3 className="m-0 mb-2 text-sm font-black">Parcel controls</h3>
              <div className="grid grid-cols-2 gap-2">
                <button className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black">
                  Open trip
                </button>
                <button className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black">
                  Contact support
                </button>
                <button className="rounded-[10px] border border-[rgb(var(--warning))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black text-[rgb(var(--warning))]">
                  Mark damaged
                </button>
                <button className="rounded-[10px] border border-[rgb(var(--destructive))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black text-[rgb(var(--destructive))]">
                  Cancel parcel
                </button>
              </div>
            </section>

            <section>
              <h3 className="m-0 mb-2 text-sm font-black">Timeline</h3>
              <div className="grid gap-2">
                {selected.timeline.map((event) => (
                  <div
                    key={`${event.time}-${event.label}`}
                    className="grid grid-cols-[74px_1fr] gap-3 text-sm"
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

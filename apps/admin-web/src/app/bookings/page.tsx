"use client";

import { useMemo, useState } from "react";
import { formatUzs } from "@nodex/ui";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "../admin-shell";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";
type RequestStatus = "Pending driver" | "Accepted" | "Declined" | "Expired" | "Cancelled";

type SeatRequest = {
  id: string;
  passenger: string;
  route: string;
  trip: string;
  driver: string;
  seat: string;
  amountMinor: number;
  status: RequestStatus;
  submitted: string;
  attention: string;
  timeline: Array<{ label: string; time: string }>;
};

const requests: SeatRequest[] = [
  {
    id: "seat-request-pending",
    passenger: "Dilshod Allamuratov",
    route: "Nukus → Urgench",
    trip: "Today · 18:30 UTC",
    driver: "Azizbek Karimov",
    seat: "Rear left",
    amountMinor: 8500000,
    status: "Pending driver",
    submitted: "12:24 UTC",
    attention: "Waiting for driver response; trip boards in 5h 54m",
    timeline: [
      { label: "Passenger sent seat request", time: "12:24" },
      { label: "Driver notification delivered", time: "12:25" },
      { label: "No payment collected in app", time: "Policy" },
    ],
  },
  {
    id: "seat-request-accepted",
    passenger: "Gulnoza Bektemirova",
    route: "Nukus → Khiva",
    trip: "Today · 17:20 UTC",
    driver: "Madina Yusupova",
    seat: "Front passenger",
    amountMinor: 9500000,
    status: "Accepted",
    submitted: "10:08 UTC",
    attention: "Accepted by driver; direct payment arranged outside the app",
    timeline: [
      { label: "Passenger sent request", time: "10:08" },
      { label: "Driver accepted seat", time: "10:16" },
      { label: "Boarding code created", time: "16:52" },
    ],
  },
  {
    id: "seat-request-expired",
    passenger: "Murod Qodirov",
    route: "Tashkent → Samarkand",
    trip: "Tomorrow · 07:40 UTC",
    driver: "Sherzod Rakhimov",
    seat: "Whole car request",
    amountMinor: 48000000,
    status: "Expired",
    submitted: "Yesterday · 18:40 UTC",
    attention: "Expired without driver response; passenger can request again",
    timeline: [
      { label: "Passenger requested whole car", time: "Yesterday" },
      { label: "Driver did not respond before timeout", time: "02:40" },
      { label: "Request expired automatically", time: "02:41" },
    ],
  },
];

function statusTone(status: RequestStatus): BadgeTone {
  if (status === "Accepted") return "success";
  if (status === "Pending driver") return "warning";
  if (status === "Declined" || status === "Expired" || status === "Cancelled") return "danger";
  return "neutral";
}

export default function BookingsPage() {
  const [selectedId, setSelectedId] = useState(requests[0]!.id);
  const selected = useMemo(
    () => requests.find((request) => request.id === selectedId) ?? requests[0]!,
    [selectedId],
  );
  const [actionNotice, setActionNotice] = useState("");

  return (
    <main className="p-5">
      <AdminPageHeader
        title="Seat Requests"
        subtitle="Monitor passenger requests, driver responses, whole-car requests, and direct-payment policy without taking driver actions."
        actions={
          <>
            <button className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black">
              Export queue
            </button>
            <button
              className="rounded-[10px] bg-[rgb(var(--primary))] px-3 py-2 text-sm font-black text-[rgb(var(--primary-foreground))]"
              type="button"
              onClick={() => {
                setSelectedId("seat-request-expired");
                setActionNotice("Exception queue opened.");
              }}
            >
              Open exceptions
            </button>
          </>
        }
      />

      <div className="grid gap-4 min-[1380px]:grid-cols-[minmax(0,1fr)_460px]">
        <AdminPanel className="overflow-hidden" label="Seat request queue">
          <div className="grid gap-3 border-b border-[rgb(var(--border))] p-4 lg:grid-cols-[1fr_auto]">
            <div className="flex flex-wrap gap-2">
              {[
                ["Pending driver", "18"],
                ["Accepted today", "46"],
                ["Whole car", "7"],
                ["Expired", "3"],
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
              <select className="min-h-10 rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm">
                <option>All request states</option>
                <option>Pending driver</option>
                <option>Accepted</option>
                <option>Expired</option>
              </select>
              <input
                className="min-h-10 w-[250px] rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm outline-none"
                placeholder="Passenger, route, driver"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm" aria-label="Admin booking list">
              <thead>
                <tr className="text-left text-[11px] font-black uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Passenger</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Trip</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Seat</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Listed fare</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr
                    key={request.id}
                    className={[
                      "cursor-pointer border-b border-[rgb(var(--border))] transition hover:bg-[rgb(var(--surface-muted))]",
                      selected.id === request.id ? "bg-[rgb(var(--info-soft))]" : "",
                    ].join(" ")}
                    onClick={() => setSelectedId(request.id)}
                  >
                    <td className="px-4 py-3">
                      <strong>{request.passenger}</strong>
                      <span className="block text-xs font-semibold text-[rgb(var(--text-muted))]">
                        Submitted {request.submitted}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {request.route}
                      <span className="block text-xs text-[rgb(var(--text-muted))]">
                        {request.trip}
                      </span>
                    </td>
                    <td className="px-4 py-3">{request.seat}</td>
                    <td className="px-4 py-3">{formatUzs(request.amountMinor)}</td>
                    <td className="px-4 py-3">
                      <AdminStatusBadge tone={statusTone(request.status)}>
                        {request.status}
                      </AdminStatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <AdminPanel className="overflow-hidden" label="Seat request detail">
          <div className="border-b border-[rgb(var(--border))] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-xl font-black">{selected.passenger}</h2>
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
              <h3 className="m-0 mb-2 text-sm font-black">Request context</h3>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-[rgb(var(--text-muted))]">Seat mode</span>
                  <strong>{selected.seat}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[rgb(var(--text-muted))]">Driver</span>
                  <strong>{selected.driver}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[rgb(var(--text-muted))]">Listed fare</span>
                  <strong>{formatUzs(selected.amountMinor)}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[rgb(var(--text-muted))]">Payment</span>
                  <strong className="text-right">Arranged directly with driver</strong>
                </div>
              </div>
            </section>

            <section>
              <h3 className="m-0 mb-2 text-sm font-black">Queue actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black"
                  type="button"
                  onClick={() => {
                    window.location.href = "/trips?state=active";
                  }}
                >
                  Open trip
                </button>
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
                  onClick={() =>
                    setActionNotice(`${selected.passenger} passenger inspector opened.`)
                  }
                >
                  View passenger
                </button>
                <button
                  className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black"
                  type="button"
                  onClick={() => setActionNotice(`Internal note added to ${selected.id}.`)}
                >
                  Add note
                </button>
              </div>
            </section>

            {actionNotice ? (
              <section className="rounded-[12px] bg-[rgb(var(--info-soft))] p-3 text-sm font-black text-[rgb(var(--info))]">
                {actionNotice}
              </section>
            ) : null}

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

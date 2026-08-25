"use client";

import { useMemo, useState } from "react";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "../admin-shell";

type Ticket = {
  id: string;
  subject: string;
  user: string;
  type: "Trip" | "Parcel" | "Account" | "Safety";
  linkedObject: string;
  status: "Open" | "Waiting on user" | "Waiting on support" | "Escalated";
  age: string;
  priority: "Normal" | "High" | "Critical";
  owner: string;
  message: string;
  history: Array<{ label: string; time: string }>;
};

const tickets: Ticket[] = [
  {
    id: "SUP-1842",
    subject: "Pickup point changed after request",
    user: "Dilshod Allamuratov",
    type: "Trip",
    linkedObject: "Nukus → Urgench · Seat request",
    status: "Waiting on support",
    age: "2h 14m",
    priority: "High",
    owner: "Malika",
    message:
      "The driver asked me to meet at a different pickup point. Please confirm the correct place.",
    history: [
      { label: "Ticket opened by passenger", time: "10:21" },
      { label: "Linked to seat request", time: "10:22" },
      { label: "Assigned to support", time: "10:28" },
    ],
  },
  {
    id: "SUP-1839",
    subject: "Parcel handoff code question",
    user: "Gulnora Ergasheva",
    type: "Parcel",
    linkedObject: "Documents envelope · Ready for pickup",
    status: "Waiting on user",
    age: "48m",
    priority: "Normal",
    owner: "Azamat",
    message: "I cannot find the pickup code in Telegram.",
    history: [
      { label: "Ticket opened", time: "11:47" },
      { label: "Support requested screenshot", time: "11:52" },
    ],
  },
  {
    id: "SUP-1831",
    subject: "Safety report needs follow-up",
    user: "Madina Yusupova",
    type: "Safety",
    linkedObject: "Case SAF-441 · Active trip",
    status: "Escalated",
    age: "18m",
    priority: "Critical",
    owner: "Safety desk",
    message: "Passenger reported aggressive behavior near pickup.",
    history: [
      { label: "Safety case opened", time: "12:09" },
      { label: "Support ticket linked", time: "12:10" },
      { label: "Escalated to safety desk", time: "12:12" },
    ],
  },
];

function tone(value: Ticket["status"] | Ticket["priority"]) {
  if (value === "Critical" || value === "Escalated") return "danger";
  if (value === "High" || value === "Waiting on support") return "warning";
  if (value === "Waiting on user") return "info";
  return "neutral";
}

export default function SupportPage() {
  const [selectedId, setSelectedId] = useState(tickets[0]!.id);
  const selected = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedId) ?? tickets[0]!,
    [selectedId],
  );

  return (
    <main className="p-5">
      <AdminPageHeader
        title="Support"
        subtitle="Operational queue for passenger, driver, parcel, and safety-linked support cases."
        actions={
          <>
            <button className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black">
              Assign selected
            </button>
            <button className="rounded-[10px] bg-[rgb(var(--primary))] px-3 py-2 text-sm font-black text-[rgb(var(--primary-foreground))]">
              Open escalated
            </button>
          </>
        }
      />

      <div className="grid gap-4 min-[1380px]:grid-cols-[minmax(0,1fr)_470px]">
        <AdminPanel className="overflow-hidden" label="Support queue">
          <div className="grid gap-3 border-b border-[rgb(var(--border))] p-4 lg:grid-cols-[1fr_auto]">
            <div className="grid gap-2 sm:grid-cols-5">
              {[
                ["Open", "18"],
                ["Waiting user", "6"],
                ["Waiting support", "9"],
                ["Escalated", "3"],
                ["Safety-linked", "2"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-[104px] rounded-[12px] bg-[rgb(var(--surface-muted))] p-3"
                >
                  <div className="text-lg font-black">{value}</div>
                  <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">{label}</div>
                </div>
              ))}
            </div>
            <input
              className="min-h-10 w-[280px] rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm outline-none"
              placeholder="Ticket, user, linked trip"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] font-black uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Ticket</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">User</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Type</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Status</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Age</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Priority</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className={[
                      "cursor-pointer border-b border-[rgb(var(--border))] transition hover:bg-[rgb(var(--surface-muted))]",
                      selected.id === ticket.id ? "bg-[rgb(var(--info-soft))]" : "",
                    ].join(" ")}
                    onClick={() => setSelectedId(ticket.id)}
                  >
                    <td className="px-4 py-3">
                      <strong>{ticket.id}</strong>
                      <span className="block text-xs text-[rgb(var(--text-muted))]">
                        {ticket.subject}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{ticket.user}</td>
                    <td className="px-4 py-3">{ticket.type}</td>
                    <td className="px-4 py-3">
                      <AdminStatusBadge tone={tone(ticket.status)}>
                        {ticket.status}
                      </AdminStatusBadge>
                    </td>
                    <td className="px-4 py-3">{ticket.age}</td>
                    <td className="px-4 py-3">
                      <AdminStatusBadge tone={tone(ticket.priority)}>
                        {ticket.priority}
                      </AdminStatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <AdminPanel className="overflow-hidden" label="Support ticket detail">
          <div className="border-b border-[rgb(var(--border))] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-xl font-black">{selected.id}</h2>
                <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                  {selected.subject}
                </p>
              </div>
              <AdminStatusBadge tone={tone(selected.priority)}>
                {selected.priority}
              </AdminStatusBadge>
            </div>
          </div>
          <div className="space-y-4 p-4">
            <section className="rounded-[12px] border border-[rgb(var(--border))] p-3">
              <h3 className="m-0 mb-2 text-sm font-black">User message</h3>
              <p className="m-0 text-sm text-[rgb(var(--text-muted))]">{selected.message}</p>
            </section>
            <section className="grid gap-2 text-sm">
              {[
                ["User", selected.user],
                ["Linked object", selected.linkedObject],
                ["Owner", selected.owner],
                ["Status", selected.status],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-[rgb(var(--text-muted))]">{label}</span>
                  <strong className="text-right">{value}</strong>
                </div>
              ))}
            </section>
            <section>
              <h3 className="m-0 mb-2 text-sm font-black">Ticket history</h3>
              <div className="grid gap-2">
                {selected.history.map((event) => (
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
            <section>
              <h3 className="m-0 mb-2 text-sm font-black">Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                {["Assign", "Add internal note", "Request information", "Resolve"].map((action) => (
                  <button
                    key={action}
                    className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black"
                    type="button"
                  >
                    {action}
                  </button>
                ))}
                <button className="rounded-[10px] border border-[rgb(var(--warning))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black text-[rgb(var(--warning))]">
                  Escalate
                </button>
              </div>
            </section>
          </div>
        </AdminPanel>
      </div>
    </main>
  );
}

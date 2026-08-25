"use client";

import { useMemo, useState } from "react";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "../admin-shell";

type Conversation = {
  id: string;
  participant: string;
  context: "Trip" | "Parcel" | "Support" | "Safety";
  route: string;
  linkedObject: string;
  lastMessage: string;
  lastActivity: string;
  unread: number;
  escalated: boolean;
  thread: Array<{
    author: string;
    visibility: "User-visible" | "Internal";
    body: string;
    time: string;
  }>;
};

const conversations: Conversation[] = [
  {
    id: "message-trip",
    participant: "Dilshod Allamuratov",
    context: "Trip",
    route: "Nukus → Urgench",
    linkedObject: "Trip today · 18:30 · Azizbek Karimov",
    lastMessage: "Can I bring one small suitcase?",
    lastActivity: "7m ago",
    unread: 2,
    escalated: false,
    thread: [
      {
        author: "Passenger",
        visibility: "User-visible",
        body: "Can I bring one small suitcase?",
        time: "12:41",
      },
      {
        author: "Driver",
        visibility: "User-visible",
        body: "Yes, one small suitcase is fine.",
        time: "12:44",
      },
      {
        author: "Admin note",
        visibility: "Internal",
        body: "No policy risk. Linked to active seat request.",
        time: "12:45",
      },
    ],
  },
  {
    id: "message-parcel",
    participant: "Gulnora Ergasheva",
    context: "Parcel",
    route: "Nukus → Khiva",
    linkedObject: "Parcel · Small electronics · In transit",
    lastMessage: "Receiver says the driver is late.",
    lastActivity: "14m ago",
    unread: 1,
    escalated: true,
    thread: [
      {
        author: "Sender",
        visibility: "User-visible",
        body: "Receiver says the driver is late.",
        time: "12:30",
      },
      {
        author: "Admin note",
        visibility: "Internal",
        body: "Parcel linked to active trip. Watch destination handoff.",
        time: "12:35",
      },
    ],
  },
  {
    id: "message-support",
    participant: "Madina Yusupova",
    context: "Support",
    route: "Tashkent → Samarkand",
    linkedObject: "Ticket SUP-1842 · Driver account",
    lastMessage: "I uploaded the new insurance photo.",
    lastActivity: "32m ago",
    unread: 0,
    escalated: false,
    thread: [
      {
        author: "Driver",
        visibility: "User-visible",
        body: "I uploaded the new insurance photo.",
        time: "11:58",
      },
      {
        author: "Support",
        visibility: "User-visible",
        body: "Thanks, our team will review it today.",
        time: "12:03",
      },
    ],
  },
];

export default function CommunicationsPage() {
  const [selectedId, setSelectedId] = useState(conversations[0]!.id);
  const selected = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? conversations[0]!,
    [selectedId],
  );

  return (
    <main className="p-5">
      <AdminPageHeader
        title="Messages"
        subtitle="Operations inbox for trip, parcel, support, and safety conversations without admin impersonation."
        actions={
          <>
            <button className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black">
              Export inbox
            </button>
            <button className="rounded-[10px] bg-[rgb(var(--primary))] px-3 py-2 text-sm font-black text-[rgb(var(--primary-foreground))]">
              Open escalations
            </button>
          </>
        }
      />

      <div className="grid gap-4 min-[1380px]:grid-cols-[minmax(0,1fr)_470px]">
        <AdminPanel className="overflow-hidden" label="Conversation queue">
          <div className="grid gap-3 border-b border-[rgb(var(--border))] p-4 lg:grid-cols-[1fr_auto]">
            <div className="flex flex-wrap gap-2">
              {["All", "Trip", "Parcel", "Support", "Safety"].map((filter) => (
                <button
                  key={filter}
                  className={[
                    "rounded-full px-3 py-2 text-sm font-black",
                    filter === "All"
                      ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                      : "bg-[rgb(var(--surface-muted))]",
                  ].join(" ")}
                  type="button"
                >
                  {filter}
                </button>
              ))}
            </div>
            <input
              className="min-h-10 w-[300px] rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm outline-none"
              placeholder="Search user, driver, route, ticket"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] font-black uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Participant</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Context</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Last message</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">State</th>
                </tr>
              </thead>
              <tbody>
                {conversations.map((conversation) => (
                  <tr
                    key={conversation.id}
                    className={[
                      "cursor-pointer border-b border-[rgb(var(--border))] transition hover:bg-[rgb(var(--surface-muted))]",
                      selected.id === conversation.id ? "bg-[rgb(var(--info-soft))]" : "",
                    ].join(" ")}
                    onClick={() => setSelectedId(conversation.id)}
                  >
                    <td className="px-4 py-3">
                      <strong>{conversation.participant}</strong>
                      <span className="block text-xs font-semibold text-[rgb(var(--text-muted))]">
                        {conversation.route}
                      </span>
                    </td>
                    <td className="px-4 py-3">{conversation.context}</td>
                    <td className="max-w-[300px] px-4 py-3 text-[rgb(var(--text-muted))]">
                      {conversation.lastMessage}
                      <span className="block text-xs">{conversation.lastActivity}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {conversation.unread > 0 && (
                          <AdminStatusBadge tone="info">
                            {conversation.unread} unread
                          </AdminStatusBadge>
                        )}
                        {conversation.escalated && (
                          <AdminStatusBadge tone="warning">Escalated</AdminStatusBadge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <AdminPanel className="overflow-hidden" label="Conversation inspector">
          <div className="border-b border-[rgb(var(--border))] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-xl font-black">{selected.participant}</h2>
                <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                  {selected.context} · {selected.linkedObject}
                </p>
              </div>
              <AdminStatusBadge tone={selected.escalated ? "warning" : "info"}>
                {selected.context}
              </AdminStatusBadge>
            </div>
          </div>
          <div className="space-y-4 p-4">
            <section>
              <h3 className="m-0 mb-2 text-sm font-black">Thread</h3>
              <div className="grid gap-2">
                {selected.thread.map((item) => (
                  <div
                    key={`${item.time}-${item.author}`}
                    className={[
                      "rounded-[12px] border p-3 text-sm",
                      item.visibility === "Internal"
                        ? "border-[rgb(var(--warning))] bg-[rgb(var(--warning-soft))]"
                        : "border-[rgb(var(--border))] bg-[rgb(var(--surface))]",
                    ].join(" ")}
                  >
                    <div className="flex justify-between gap-3">
                      <strong>{item.author}</strong>
                      <span className="text-xs font-bold text-[rgb(var(--text-muted))]">
                        {item.time}
                      </span>
                    </div>
                    <p className="m-0 mt-1 text-[rgb(var(--text-muted))]">{item.body}</p>
                    <span className="mt-2 inline-block text-[11px] font-black uppercase tracking-[0.08em]">
                      {item.visibility}
                    </span>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-[12px] border border-[rgb(var(--border))] p-3">
              <h3 className="m-0 mb-2 text-sm font-black">Linked actions</h3>
              <div className="grid grid-cols-2 gap-2">
                {["Open trip", "Open driver", "Open passenger", "Open support ticket"].map(
                  (action) => (
                    <button
                      key={action}
                      className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black"
                      type="button"
                    >
                      {action}
                    </button>
                  ),
                )}
              </div>
            </section>
            <section>
              <h3 className="m-0 mb-2 text-sm font-black">Internal note</h3>
              <textarea
                className="min-h-24 w-full rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] p-3 text-sm outline-none"
                placeholder="Visible to admins only. Does not send a message to driver or passenger."
              />
            </section>
          </div>
        </AdminPanel>
      </div>
    </main>
  );
}

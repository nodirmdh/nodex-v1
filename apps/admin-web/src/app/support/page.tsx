import { Badge, Panel, Timeline } from "@nodex/ui";

const tickets = [
  {
    subject: "Phase 9 seeded support ticket",
    type: "BOOKING",
    status: "IN_PROGRESS",
    priority: "NORMAL",
  },
  {
    subject: "Parcel handover question",
    type: "PARCEL",
    status: "WAITING_FOR_USER",
    priority: "HIGH",
  },
  { subject: "Driver account review", type: "ACCOUNT", status: "UNDER_REVIEW", priority: "LOW" },
];

export default function SupportPage() {
  return (
    <main className="grid gap-4 p-5 lg:grid-cols-2">
      <Panel className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="m-0 text-lg font-black">Support queue</h1>
            <div className="text-sm text-slate-500">
              Tickets, SLA, assignments, and user-visible replies
            </div>
          </div>
          <Badge tone="warning">3 open</Badge>
        </div>
        <div className="space-y-2">
          {tickets.map((ticket) => (
            <div
              key={ticket.subject}
              className="flex items-center justify-between rounded-[var(--radius-md)] border border-[rgb(var(--border))] p-3"
            >
              <div>
                <div className="font-semibold">{ticket.subject}</div>
                <div className="text-xs text-slate-500">
                  {ticket.type} / {ticket.priority}
                </div>
              </div>
              <Badge tone={ticket.status === "WAITING_FOR_USER" ? "warning" : "info"}>
                {ticket.status}
              </Badge>
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="space-y-4">
        <div>
          <h2 className="m-0 text-base font-bold">Ticket timeline</h2>
          <div className="text-sm text-slate-500">
            Internal notes stay visible only to admins and support.
          </div>
        </div>
        <Timeline
          items={[
            { label: "Ticket opened", time: "Seed", active: true },
            { label: "Assigned to support", time: "Seed" },
            { label: "Internal note created", time: "Admin only" },
            { label: "Reply sent to requester", time: "Visible" },
          ]}
        />
        <div className="grid gap-2 rounded-[var(--radius-md)] border border-[rgb(var(--border))] p-3">
          <div className="text-sm font-bold">Actions</div>
          <div className="flex flex-wrap gap-2">
            {["Assign", "Reply", "Internal note", "Resolve"].map((action) => (
              <button
                key={action}
                className="rounded-[var(--radius-md)] border border-[rgb(var(--border))] px-3 py-2 text-sm font-semibold"
                type="button"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </Panel>
    </main>
  );
}

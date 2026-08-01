import { Badge, Panel, Timeline } from "@nodex/ui";

const conversations = [
  { title: "Booking conversation", status: "ACTIVE", participant: "Client / Driver", reports: 0 },
  { title: "Parcel conversation", status: "ACTIVE", participant: "Sender / Driver", reports: 1 },
];

const deliveries = [
  { channel: "IN_APP", status: "DELIVERED", title: "Support ticket updated" },
  { channel: "TELEGRAM", status: "PENDING", title: "New chat message" },
];

export default function CommunicationsPage() {
  return (
    <main className="grid gap-4 p-5 xl:grid-cols-[1.1fr_0.9fr]">
      <Panel className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="m-0 text-lg font-black">Communications</h1>
            <div className="text-sm text-slate-500">
              Read-only moderation view for chat and reports
            </div>
          </div>
          <Badge tone="info">Phase 9</Badge>
        </div>
        <div className="space-y-2">
          {conversations.map((conversation) => (
            <div
              key={conversation.title}
              className="grid gap-2 rounded-[var(--radius-md)] border border-[rgb(var(--border))] p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{conversation.title}</div>
                  <div className="text-xs text-slate-500">{conversation.participant}</div>
                </div>
                <Badge tone={conversation.reports > 0 ? "warning" : "success"}>
                  {conversation.reports} reports
                </Badge>
              </div>
              <div className="text-sm text-slate-600">Status: {conversation.status}</div>
            </div>
          ))}
        </div>
      </Panel>
      <div className="grid gap-4">
        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Delivery outbox</h2>
          <div className="space-y-2">
            {deliveries.map((delivery) => (
              <div
                key={`${delivery.channel}-${delivery.title}`}
                className="flex items-center justify-between rounded-[var(--radius-md)] border border-[rgb(var(--border))] p-3"
              >
                <div>
                  <div className="font-semibold">{delivery.title}</div>
                  <div className="text-xs text-slate-500">{delivery.channel}</div>
                </div>
                <Badge tone={delivery.status === "DELIVERED" ? "success" : "warning"}>
                  {delivery.status}
                </Badge>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Communication timeline</h2>
          <Timeline
            items={[
              { label: "Chat message sent", time: "09:20", active: true },
              { label: "Notification queued", time: "09:20" },
              { label: "Telegram delivery pending", time: "Worker" },
            ]}
          />
        </Panel>
      </div>
    </main>
  );
}

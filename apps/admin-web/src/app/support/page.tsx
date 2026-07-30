import { Badge, Panel, Timeline } from "@nodex/ui";

export default function SupportPage() {
  return (
    <main className="grid gap-4 p-5 lg:grid-cols-2">
      <Panel>
        <h1 className="m-0 mb-3 text-lg font-black">Support queue</h1>
        <div className="space-y-2">
          {["Driver did not arrive", "Parcel question", "Payment receipt review"].map((ticket) => (
            <div
              key={ticket}
              className="flex items-center justify-between rounded-[var(--radius-md)] border border-[rgb(var(--border))] p-3"
            >
              <span className="font-semibold">{ticket}</span>
              <Badge tone="warning">NEW</Badge>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <h2 className="m-0 mb-3 text-base font-bold">Ticket timeline</h2>
        <Timeline
          items={[
            { label: "Ticket opened", time: "09:05", active: true },
            { label: "SLA timer started", time: "09:05" },
          ]}
        />
      </Panel>
    </main>
  );
}

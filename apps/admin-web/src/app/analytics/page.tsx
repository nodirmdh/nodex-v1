import { Badge, Panel } from "@nodex/ui";

const metrics = [
  { key: "search.performed", value: "128", label: "Searches" },
  { key: "payment.succeeded", value: "42", label: "Paid trips" },
  { key: "refund.requested", value: "3", label: "Refund requests" },
  { key: "support.created", value: "7", label: "Support tickets" },
];

const funnel = [
  { step: "Search", count: 128 },
  { step: "Trip detail", count: 84 },
  { step: "Booking started", count: 56 },
  { step: "Payment succeeded", count: 42 },
];

export default function AdminAnalyticsPage() {
  return (
    <main className="space-y-4 p-5">
      <Panel className="space-y-3" aria-label="Analytics dashboard">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="m-0 text-lg font-black">Analytics</h1>
            <p className="m-0 text-sm text-slate-500">
              Privacy-safe events, funnel health, finance metrics, and launch monitoring.
            </p>
          </div>
          <Badge tone="success">Daily UTC</Badge>
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.key}
              className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3"
            >
              <strong>{metric.value}</strong>
              <span className="block text-sm text-slate-500">{metric.label}</span>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel className="space-y-3" aria-label="Conversion funnel">
          <h2 className="m-0 text-base font-bold">Conversion funnel</h2>
          {funnel.map((step, index) => (
            <div
              key={step.step}
              className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <strong>{step.step}</strong>
                <Badge tone={index === funnel.length - 1 ? "success" : "info"}>{step.count}</Badge>
              </div>
            </div>
          ))}
        </Panel>

        <Panel className="space-y-3" aria-label="Launch reporting">
          <h2 className="m-0 text-base font-bold">Launch reporting</h2>
          <div className="rounded-[var(--radius-md)] border border-[rgb(var(--border))] p-3">
            <strong>Daily business snapshot</strong>
            <p className="m-0 text-sm text-slate-500">
              Revenue, bookings, parcels, support load, and safety signals.
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[rgb(var(--border))] p-3">
            <strong>Operational exceptions</strong>
            <p className="m-0 text-sm text-slate-500">
              Refund backlog, payout failures, stale queues, and reconciliation mismatch.
            </p>
          </div>
        </Panel>
      </div>
    </main>
  );
}

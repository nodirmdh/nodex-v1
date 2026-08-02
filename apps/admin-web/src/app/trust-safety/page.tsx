import { Badge, Panel, Timeline } from "@nodex/ui";

const cases = [
  { title: "Review content report", status: "OPEN", severity: "LOW" },
  { title: "Safety report triage", status: "TRIAGED", severity: "MEDIUM" },
  { title: "Account restriction review", status: "OPEN", severity: "HIGH" },
];

export default function TrustSafetyPage() {
  return (
    <main className="grid gap-4 p-5 lg:grid-cols-[1.2fr_0.8fr]">
      <Panel className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="m-0 text-lg font-black">Trust & Safety queue</h1>
            <div className="text-sm text-slate-500">
              Reviews, safety reports, restrictions, and moderation cases
            </div>
          </div>
          <Badge tone="warning">3 active</Badge>
        </div>
        <div className="space-y-2">
          {cases.map((item) => (
            <div
              key={item.title}
              className="grid gap-2 rounded-[var(--radius-md)] border border-[rgb(var(--border))] p-3 sm:grid-cols-[1fr_auto_auto]"
            >
              <strong>{item.title}</strong>
              <Badge tone={item.severity === "HIGH" ? "danger" : "info"}>{item.severity}</Badge>
              <Badge tone="warning">{item.status}</Badge>
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="space-y-4">
        <div>
          <h2 className="m-0 text-base font-bold">Case timeline</h2>
          <div className="text-sm text-slate-500">
            Sensitive actions are recorded in audit and trust/safety history.
          </div>
        </div>
        <Timeline
          items={[
            { label: "Safety report submitted", time: "User", active: true },
            { label: "Case assigned", time: "Support" },
            { label: "Restriction applied", time: "Admin" },
            { label: "Reliability profile recalculated", time: "Worker" },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          {["Assign", "Resolve", "Restrict account", "Add note"].map((action) => (
            <button
              key={action}
              className="rounded-[var(--radius-md)] border border-[rgb(var(--border))] px-3 py-2 text-sm font-semibold"
              type="button"
            >
              {action}
            </button>
          ))}
        </div>
      </Panel>
    </main>
  );
}

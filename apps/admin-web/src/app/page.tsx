import { Badge, EmptyState, Panel, Timeline } from "@nodex/ui";
import { UsersPanel } from "./users-panel";

export default function AdminDashboard() {
  return (
    <main className="space-y-5 p-5">
      <section className="grid gap-3 md:grid-cols-4">
        {[
          ["Published trips", "128", "info"],
          ["Active drivers", "42", "success"],
          ["Open tickets", "9", "warning"],
          ["Risk reviews", "3", "danger"],
        ].map(([label, value, tone]) => (
          <Panel key={label}>
            <div className="text-sm text-slate-500">{label}</div>
            <div className="mt-2 text-3xl font-black">{value}</div>
            <Badge tone={tone as "info"}>Mock KPI</Badge>
          </Panel>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Recent operational events</h2>
          <Timeline
            items={[
              { label: "Driver application approved", time: "09:24", active: true },
              { label: "Booking moved to paid", time: "09:18" },
              { label: "Support ticket opened", time: "09:05" },
            ]}
          />
        </Panel>
        <EmptyState
          title="Demand without supply"
          body="Search-without-results aggregates will be displayed here after analytics events are wired."
        />
      </section>
      <UsersPanel />
    </main>
  );
}

import { AppHeader, Badge, BottomNav, Button, Panel, Timeline } from "@nodex/ui";

export default function DriverReviewsPage() {
  return (
    <main className="nodex-app mobile-shell pb-20">
      <AppHeader title="Reviews" subtitle="Passenger and sender feedback" />
      <div className="space-y-4 px-4">
        <Panel className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="m-0 text-lg font-black">Reliability profile</h1>
              <div className="text-sm text-slate-500">
                Parcel delivery and completed trip signals
              </div>
            </div>
            <Badge tone="success">Reliable</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[var(--radius-md)] border border-[rgb(var(--border))] p-3">
              <div className="text-xs text-slate-500">Rating</div>
              <strong>5.0</strong>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[rgb(var(--border))] p-3">
              <div className="text-xs text-slate-500">Reports</div>
              <strong>Triaged</strong>
            </div>
          </div>
          <Button className="min-h-11">View received reviews</Button>
        </Panel>
        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Reliability timeline</h2>
          <Timeline
            items={[
              { label: "Parcel delivered", time: "Seed", active: true },
              { label: "Rating aggregate recalculated", time: "Worker" },
              { label: "Chat restriction event tracked", time: "Admin" },
            ]}
          />
        </Panel>
      </div>
      <BottomNav
        items={[
          { label: "Trips" },
          { label: "Parcels" },
          { label: "Reviews", active: true },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}

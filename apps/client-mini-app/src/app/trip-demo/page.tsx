import { AppHeader, Badge, BottomNav, Panel, SeatMap, Timeline, VehicleSummary } from "@nodex/ui";

export default function TripDemoPage() {
  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="Trip details" subtitle="Nukus to Urgench" />
      <div className="space-y-4 px-4">
        <VehicleSummary />
        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="m-0 text-base font-bold">Route timeline</h2>
            <Badge tone="success">Reliable</Badge>
          </div>
          <Timeline
            items={[
              { label: "Nukus, city center", time: "08:30", active: true },
              { label: "Beruniy stop", time: "09:45" },
              { label: "Urgench station", time: "11:20" },
            ]}
          />
        </Panel>
        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Seat map</h2>
          <SeatMap />
        </Panel>
        <Panel className="text-sm text-slate-600 dark:text-slate-300">
          Cancellation demo: free cancellation rules and final policy snapshots will be provided by
          API later.
        </Panel>
      </div>
      <BottomNav
        items={[
          { label: "Home" },
          { label: "Search" },
          { label: "Trip", active: true },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}

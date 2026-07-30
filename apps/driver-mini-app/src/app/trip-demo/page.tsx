import { AppHeader, BottomNav, Button, Panel, SeatMap, Timeline } from "@nodex/ui";

export default function TripOperationDemo() {
  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="Operate trip" subtitle="Nukus to Khiva" />
      <div className="space-y-4 px-4">
        <Panel>
          <Timeline
            items={[
              { label: "Driver confirmed", time: "15:50", active: true },
              { label: "Boarding", time: "16:20" },
              { label: "Departure", time: "16:40" },
            ]}
          />
        </Panel>
        <Panel>
          <SeatMap />
        </Panel>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary">Chat</Button>
          <Button variant="secondary">Call</Button>
        </div>
        <Button className="w-full min-h-14">Mark passenger boarded</Button>
      </div>
      <BottomNav
        items={[
          { label: "Home" },
          { label: "Trips", active: true },
          { label: "Create" },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}

import { AppHeader, Badge, BottomNav, Button, DriverSummary, Panel, SeatMap } from "@nodex/ui";
import { mockDriverPassengers } from "@nodex/testing";

export default function DriverHome() {
  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="Driver" subtitle="Ready for today's trip" />
      <div className="space-y-4 px-4">
        <Panel className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-500">Verification</div>
            <div className="text-lg font-bold">Approved</div>
          </div>
          <Badge tone="success">Can create trips</Badge>
        </Panel>
        <DriverSummary />
        <Button className="w-full min-h-14 text-base">Start boarding mode</Button>
        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="m-0 text-base font-bold">Seat occupancy</h2>
            <Badge tone="info">Mock</Badge>
          </div>
          <SeatMap />
        </Panel>
        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Passengers</h2>
          <div className="divide-y divide-[rgb(var(--border))]">
            {mockDriverPassengers.map((passenger) => (
              <div key={passenger.seat} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {passenger.seat} - {passenger.name}
                </span>
                <Badge>{passenger.status}</Badge>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <BottomNav
        items={[
          { label: "Home", active: true },
          { label: "Trips" },
          { label: "Create" },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}

import { AppHeader, Badge, BottomNav, Panel } from "@nodex/ui";
import { mockDriverPassengers } from "@nodex/testing";

export default function PassengersDemo() {
  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="Passengers" subtitle="Boarding list" />
      <div className="space-y-4 px-4">
        <Panel>
          {mockDriverPassengers.map((passenger) => (
            <div
              key={passenger.seat}
              className="flex items-center justify-between border-b border-[rgb(var(--border))] py-3 last:border-0"
            >
              <span className="font-semibold">
                {passenger.seat} - {passenger.name}
              </span>
              <Badge>{passenger.status}</Badge>
            </div>
          ))}
        </Panel>
      </div>
      <BottomNav
        items={[{ label: "Home" }, { label: "Trips" }, { label: "Create" }, { label: "Profile" }]}
      />
    </main>
  );
}

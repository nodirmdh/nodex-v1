import { AppHeader, Badge, BottomNav, Button, Panel, VehicleSummary } from "@nodex/ui";

export default function CreateTripDemo() {
  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="Create trip" subtitle="Trip setup" />
      <div className="space-y-4 px-4">
        <div className="flex gap-2">
          {["Route", "Vehicle", "Seats", "Price"].map((step, index) => (
            <Badge key={step} tone={index === 0 ? "info" : "neutral"}>
              {step}
            </Badge>
          ))}
        </div>
        <Panel className="space-y-3">
          <label className="grid gap-1 text-sm">
            Route template
            <input
              className="rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3 py-2"
              defaultValue="Nukus to Urgench"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Departure
            <input
              className="rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3 py-2"
              defaultValue="Tomorrow, 08:30"
            />
          </label>
        </Panel>
        <VehicleSummary />
        <Button className="w-full">Continue</Button>
      </div>
      <BottomNav
        items={[
          { label: "Home" },
          { label: "Trips" },
          { label: "Create", active: true },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}

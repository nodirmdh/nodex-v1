import { AppHeader, Badge, BottomNav, Button, Panel } from "@nodex/ui";

export default function DriverSosPage() {
  return (
    <main className="nodex-app mobile-shell pb-20">
      <AppHeader title="SOS" subtitle="Record emergency actions during a trip" />
      <div className="space-y-4 px-4">
        <Panel className="space-y-3">
          <Badge tone="warning">Manual emergency guidance</Badge>
          <h1 className="m-0 text-lg font-black">Driver emergency actions</h1>
          <p className="m-0 text-sm text-slate-600">
            The flow records the action and prepares support context. It does not contact emergency
            services automatically.
          </p>
          <div className="grid gap-2">
            <Button className="min-h-11">Call emergency number</Button>
            <Button className="min-h-11">Notify support</Button>
            <Button className="min-h-11">Copy trip details</Button>
          </div>
        </Panel>
      </div>
      <BottomNav
        items={[
          { label: "Trips" },
          { label: "Safety", active: true },
          { label: "Support" },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}

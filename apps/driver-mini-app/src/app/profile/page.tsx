import { AppHeader, Badge, BottomNav, Panel } from "@nodex/ui";
import { DriverAuthPanel } from "../driver-auth-panel";

export default function DriverProfile() {
  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="Driver profile" subtitle="Vehicle, docs, settings" />
      <div className="space-y-4 px-4">
        <DriverAuthPanel />
        <Panel>
          <div className="text-lg font-bold">Preview driver</div>
          <div className="text-sm text-slate-500">No real personal data in mock mode</div>
        </Panel>
        <Panel className="flex flex-wrap gap-2">
          <Badge tone="success">Approved</Badge>
          <Badge>1 vehicle</Badge>
          <Badge tone="info">96% reliability</Badge>
        </Panel>
      </div>
      <BottomNav
        items={[
          { label: "Home" },
          { label: "Trips" },
          { label: "Create" },
          { label: "Profile", active: true },
        ]}
      />
    </main>
  );
}

import { AppHeader, Badge, BottomNav, Button, Panel } from "@nodex/ui";

export default function ClientSosPage() {
  return (
    <main className="nodex-app mobile-shell pb-20">
      <AppHeader title="SOS" subtitle="Safety actions for an active trip" />
      <div className="space-y-4 px-4">
        <Panel className="space-y-3">
          <Badge tone="warning">Manual safety flow</Badge>
          <h1 className="m-0 text-lg font-black">Emergency help</h1>
          <p className="m-0 text-sm text-slate-600">
            Nodex records the action, shares trip details, and guides you to contact local emergency
            services.
          </p>
          <div className="grid gap-2">
            <Button className="min-h-11">Call emergency number</Button>
            <Button className="min-h-11">Share trip with trusted contact</Button>
            <Button className="min-h-11">Create safety report</Button>
          </div>
        </Panel>
      </div>
      <BottomNav
        items={[
          { label: "Home" },
          { label: "Safety", active: true },
          { label: "Support" },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}

import { AppHeader, Badge, BottomNav, Button, Panel, Timeline } from "@nodex/ui";

export default function ClientSafetyPage() {
  return (
    <main className="nodex-app mobile-shell pb-20">
      <AppHeader title="Safety" subtitle="Reports, trusted contacts, and trip sharing" />
      <div className="space-y-4 px-4">
        <Panel className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="m-0 text-lg font-black">Trusted contacts</h1>
              <div className="text-sm text-slate-500">Phase 10 Trusted Contact</div>
            </div>
            <Badge tone="success">Active</Badge>
          </div>
          <Button className="min-h-11">Share current trip</Button>
        </Panel>
        <Panel className="space-y-3">
          <h2 className="m-0 text-base font-bold">Safety report</h2>
          <p className="m-0 text-sm text-slate-600">
            Reports can be linked to trips, parcels, messages, or reviews.
          </p>
          <Button className="min-h-11">Create safety report</Button>
        </Panel>
        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Safety timeline</h2>
          <Timeline
            items={[
              { label: "Trip share created", time: "Seed", active: true },
              { label: "Trusted contact added", time: "Seed" },
              { label: "Safety report triaged", time: "Admin" },
            ]}
          />
        </Panel>
      </div>
      <BottomNav
        items={[
          { label: "Home" },
          { label: "Messages" },
          { label: "Safety", active: true },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}

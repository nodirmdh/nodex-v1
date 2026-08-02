import { AppHeader, Badge, BottomNav, Button, Panel, Timeline } from "@nodex/ui";

export default function DriverSafetyPage() {
  return (
    <main className="nodex-app mobile-shell pb-20">
      <AppHeader title="Safety" subtitle="Incident reports and trip sharing" />
      <div className="space-y-4 px-4">
        <Panel className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="m-0 text-lg font-black">Driver safety center</h1>
              <div className="text-sm text-slate-500">Reports, blocks, and support escalation</div>
            </div>
            <Badge tone="info">Monitored</Badge>
          </div>
          <Button className="min-h-11">Create safety report</Button>
        </Panel>
        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Incident timeline</h2>
          <Timeline
            items={[
              { label: "Report submitted", time: "User", active: true },
              { label: "Trust and Safety triaged", time: "Admin" },
              { label: "Resolution visible when complete", time: "Later" },
            ]}
          />
        </Panel>
      </div>
      <BottomNav
        items={[
          { label: "Trips" },
          { label: "Messages" },
          { label: "Safety", active: true },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}

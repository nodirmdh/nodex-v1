import { AppHeader, Badge, BottomNav, Button, Panel, Timeline } from "@nodex/ui";

export default function DriverSupportPage() {
  return (
    <main className="nodex-app mobile-shell pb-20">
      <AppHeader title="Support" subtitle="Trip and parcel operational help" />
      <div className="space-y-4 px-4">
        <Panel className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="m-0 text-lg font-black">Parcel handover question</h1>
              <div className="text-sm text-slate-500">Connected to active parcel</div>
            </div>
            <Badge tone="warning">Waiting</Badge>
          </div>
          <p className="m-0 text-sm">
            Support can see the linked trip, parcel, and ticket timeline.
          </p>
          <Button className="min-h-11">Contact support</Button>
        </Panel>
        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Support timeline</h2>
          <Timeline
            items={[
              { label: "Ticket opened", time: "Today", active: true },
              { label: "Internal note hidden from users", time: "Admin only" },
            ]}
          />
        </Panel>
      </div>
      <BottomNav
        items={[
          { label: "Trips" },
          { label: "Parcels" },
          { label: "Support", active: true },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}

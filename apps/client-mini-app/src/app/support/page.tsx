import { AppHeader, Badge, BottomNav, Button, Panel, Timeline } from "@nodex/ui";

export default function ClientSupportPage() {
  return (
    <main className="nodex-app mobile-shell pb-20">
      <AppHeader title="Support" subtitle="Tickets for bookings, trips, and parcels" />
      <div className="space-y-4 px-4">
        <Panel className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="m-0 text-lg font-black">Phase 9 seeded support ticket</h1>
              <div className="text-sm text-slate-500">Booking support</div>
            </div>
            <Badge tone="info">In progress</Badge>
          </div>
          <p className="m-0 text-sm">Need help coordinating the pickup time.</p>
          <Button className="min-h-11">Add message</Button>
        </Panel>
        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Ticket history</h2>
          <Timeline
            items={[
              { label: "Ticket opened", time: "Seed", active: true },
              { label: "Support started review", time: "Seed" },
              { label: "SLA timer active", time: "Today" },
            ]}
          />
        </Panel>
      </div>
      <BottomNav
        items={[
          { label: "Home" },
          { label: "Messages" },
          { label: "Support", active: true },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}

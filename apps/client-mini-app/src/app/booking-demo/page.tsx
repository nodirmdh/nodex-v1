import { AppHeader, BottomNav, Button, Panel, PriceBreakdown, SeatMap } from "@nodex/ui";

export default function BookingDemoPage() {
  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="Booking demo" subtitle="Mock checkout state" />
      <div className="space-y-4 px-4">
        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Choose seats</h2>
          <SeatMap />
        </Panel>
        <Panel className="space-y-3">
          <label className="grid gap-1 text-sm">
            Passenger name
            <input
              className="rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3 py-2"
              defaultValue="Passenger 1"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Baggage
            <select className="rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3 py-2">
              <option>Medium</option>
              <option>Large</option>
            </select>
          </label>
        </Panel>
        <PriceBreakdown />
      </div>
      <div className="fixed inset-x-0 bottom-14 mx-auto max-w-md p-4">
        <Button className="w-full">Confirm demo booking</Button>
      </div>
      <BottomNav
        items={[
          { label: "Home" },
          { label: "Search" },
          { label: "Trip", active: true },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}

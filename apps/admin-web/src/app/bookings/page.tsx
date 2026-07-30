import { EmptyState, Panel } from "@nodex/ui";

export default function BookingsPage() {
  return (
    <main className="space-y-4 p-5">
      <Panel>
        <h1 className="m-0 text-lg font-black">Bookings</h1>
        <div className="text-sm text-slate-500">Payment and hold states will be surfaced here.</div>
      </Panel>
      <EmptyState title="No real bookings" body="Foundation uses visual states only." />
    </main>
  );
}

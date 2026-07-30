import { Badge, EmptyState, Panel } from "@nodex/ui";

export default function TripsPage() {
  return (
    <main className="space-y-4 p-5">
      <Panel className="flex items-center justify-between">
        <div>
          <h1 className="m-0 text-lg font-black">Trips</h1>
          <div className="text-sm text-slate-500">Route operations shell</div>
        </div>
        <Badge tone="info">Mock data</Badge>
      </Panel>
      <EmptyState
        title="Trip table placeholder"
        body="Real trip lifecycle will start after foundation approval."
      />
    </main>
  );
}

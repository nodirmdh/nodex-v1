import { AppHeader, Badge, BottomNav, Button, Panel, Timeline, formatUzs } from "@nodex/ui";

export default async function ParcelDetailPage({
  params,
}: {
  params: Promise<{ parcelId: string }>;
}) {
  const { parcelId } = await params;

  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="Parcel detail" subtitle={parcelId} />
      <div className="space-y-4 px-4">
        <Panel className="space-y-3" aria-label="Parcel tracking detail">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="m-0 text-lg font-black">Documents envelope</h1>
              <p className="m-0 text-sm text-slate-500">
                Nukus Central Station to Urgench Bus Station
              </p>
            </div>
            <Badge tone="info">READY_FOR_PICKUP</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
              <span className="block text-slate-500">Price</span>
              <strong>{formatUzs(3000000)}</strong>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
              <span className="block text-slate-500">Code</span>
              <strong>Available to sender</strong>
            </div>
          </div>
        </Panel>

        <Panel className="space-y-3" aria-label="Parcel pickup code">
          <h2 className="m-0 text-base font-bold">Pickup verification</h2>
          <div className="rounded-[var(--radius-md)] border border-dashed border-[rgb(var(--border))] p-4 text-center text-2xl font-black tracking-[0.2em]">
            482913
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button">Regenerate</Button>
            <Button type="button" variant="secondary">
              Cancel parcel
            </Button>
          </div>
        </Panel>

        <Panel aria-label="Parcel lifecycle timeline">
          <Timeline
            items={[
              { label: "Created by sender", time: "09:00 UTC", active: true },
              { label: "Accepted by driver", time: "09:06 UTC", active: true },
              { label: "Handed to driver", time: "09:20 UTC", active: true },
              { label: "Ready for pickup", time: "12:10 UTC", active: true },
              { label: "Delivered", time: "After pickup code" },
            ]}
          />
        </Panel>
      </div>
      <BottomNav
        items={[
          { label: "Home" },
          { label: "Search" },
          { label: "Parcels", active: true },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}

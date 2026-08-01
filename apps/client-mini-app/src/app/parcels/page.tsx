import Link from "next/link";
import { AppHeader, Badge, BottomNav, Button, Panel, Timeline, formatUzs } from "@nodex/ui";

const parcels = [
  {
    id: "phase8-parcel-ready",
    route: "Nukus to Urgench",
    title: "Documents envelope",
    status: "READY_FOR_PICKUP",
    category: "Documents",
    priceMinor: 3000000,
  },
  {
    id: "phase8-parcel-accepted",
    route: "Nukus to Khiva",
    title: "Small electronics",
    status: "ACCEPTED",
    category: "Electronics",
    priceMinor: 3500000,
  },
];

function tone(status: string) {
  if (status === "DELIVERED") return "success";
  if (status === "READY_FOR_PICKUP" || status === "IN_TRANSIT") return "info";
  if (status.startsWith("CANCELLED") || status === "REJECTED") return "danger";
  return "warning";
}

export default function ClientParcelsPage() {
  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="Parcels" subtitle="Create, track, and verify handover codes" />
      <div className="space-y-4 px-4">
        <Panel className="space-y-3" aria-label="Parcel creation form">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="m-0 text-lg font-black">Send a parcel</h1>
              <p className="m-0 text-sm text-slate-500">
                Route-linked delivery with approved drivers.
              </p>
            </div>
            <Badge tone="info">UZS</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label className="grid gap-1">
              <span className="font-medium">Category</span>
              <select className="min-h-11 rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-white px-3">
                <option>Documents</option>
                <option>Clothing</option>
                <option>Electronics</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span className="font-medium">Weight</span>
              <input
                className="min-h-11 rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-white px-3"
                defaultValue="1.2 kg"
              />
            </label>
          </div>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Recipient phone</span>
            <input
              className="min-h-11 rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-white px-3"
              defaultValue="+998 90 123 45 67"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button">Create parcel</Button>
            <Button type="button" variant="secondary">
              Add photos
            </Button>
          </div>
        </Panel>

        <section aria-label="My parcel orders" className="space-y-3">
          {parcels.map((parcel) => (
            <Panel key={parcel.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="m-0 text-base font-bold">{parcel.title}</h2>
                  <p className="m-0 text-sm text-slate-500">
                    {parcel.route} - {parcel.category}
                  </p>
                </div>
                <Badge tone={tone(parcel.status)}>{parcel.status}</Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <strong>{formatUzs(parcel.priceMinor)}</strong>
                <Link
                  className="text-sm font-semibold text-[rgb(var(--primary))]"
                  href={`/parcels/${parcel.id}`}
                >
                  Track
                </Link>
              </div>
            </Panel>
          ))}
        </section>

        <Panel aria-label="Parcel timeline preview">
          <Timeline
            items={[
              { label: "Parcel created", time: "09:00", active: true },
              { label: "Driver accepted", time: "09:06", active: true },
              { label: "Ready for pickup", time: "After arrival" },
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

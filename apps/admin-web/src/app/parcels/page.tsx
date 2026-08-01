import { Badge, Button, Panel, Timeline, formatUzs } from "@nodex/ui";

const parcels = [
  {
    id: "parcel-ready",
    route: "Nukus to Urgench",
    title: "Documents envelope",
    sender: "A. Karimov",
    driver: "Phase Driver",
    status: "READY_FOR_PICKUP",
    priceMinor: 3000000,
    createdAt: "2026-08-01 09:00 UTC",
  },
  {
    id: "parcel-damaged",
    route: "Nukus to Khiva",
    title: "Small electronics",
    sender: "M. Seitov",
    driver: "Route partner",
    status: "DAMAGED",
    priceMinor: 3500000,
    createdAt: "2026-08-01 09:18 UTC",
  },
  {
    id: "parcel-accepted",
    route: "Nukus to Bukhara",
    title: "Clothing package",
    sender: "D. Allamuratov",
    driver: "Verified driver",
    status: "ACCEPTED",
    priceMinor: 3000000,
    createdAt: "2026-08-01 09:30 UTC",
  },
];

function tone(status: string) {
  if (status === "DELIVERED") return "success";
  if (status === "READY_FOR_PICKUP" || status === "IN_TRANSIT") return "info";
  if (status === "DAMAGED" || status === "LOST" || status === "DISPUTED") return "danger";
  return "warning";
}

export default function AdminParcelsPage() {
  const selected = parcels[0]!;

  return (
    <main className="space-y-4 p-5">
      <Panel className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="m-0 text-lg font-black">Parcel moderation</h1>
            <div className="text-sm text-slate-500">
              Route-linked parcels, lifecycle controls, issue states, and audit history.
            </div>
          </div>
          <Badge tone="info">{parcels.length} records</Badge>
        </div>
        <div className="grid grid-cols-4 gap-2 text-sm">
          <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
            <strong>2</strong>
            <span className="block text-slate-500">Active</span>
          </div>
          <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
            <strong>1</strong>
            <span className="block text-slate-500">Issue</span>
          </div>
          <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
            <strong>0</strong>
            <span className="block text-slate-500">Cancelled</span>
          </div>
          <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
            <strong>{formatUzs(9500000)}</strong>
            <span className="block text-slate-500">Parcel value</span>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm" aria-label="Admin parcel list">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="p-2">Parcel</th>
                <th className="p-2">Sender</th>
                <th className="p-2">Driver</th>
                <th className="p-2">Route</th>
                <th className="p-2">Price</th>
                <th className="p-2">Status</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {parcels.map((parcel) => (
                <tr key={parcel.id} className="border-t border-[rgb(var(--border))]">
                  <td className="p-2">
                    <strong>{parcel.title}</strong>
                    <span className="block text-xs text-slate-500">{parcel.createdAt}</span>
                  </td>
                  <td className="p-2">{parcel.sender}</td>
                  <td className="p-2">{parcel.driver}</td>
                  <td className="p-2">{parcel.route}</td>
                  <td className="p-2">{formatUzs(parcel.priceMinor)}</td>
                  <td className="p-2">
                    <Badge tone={tone(parcel.status)}>{parcel.status}</Badge>
                  </td>
                  <td className="p-2">
                    <Button type="button" variant="secondary">
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel className="space-y-4" aria-label="Parcel moderation detail">
          <div>
            <h2 className="m-0 text-base font-bold">Selected parcel</h2>
            <p className="m-0 text-sm text-slate-500">
              {selected.title} - {selected.route}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={tone(selected.status)}>{selected.status}</Badge>
            <Badge>{selected.sender}</Badge>
            <Badge>{selected.driver}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary">
              Admin cancel
            </Button>
            <Button type="button" variant="secondary">
              Mark lost
            </Button>
            <Button type="button" variant="secondary">
              Mark damaged
            </Button>
            <Button type="button" variant="secondary">
              Open dispute
            </Button>
          </div>
          <div>
            <h3 className="m-0 mb-3 text-sm font-bold">History</h3>
            <Timeline
              items={[
                { label: "Parcel created", time: "Client", active: true },
                { label: "Driver accepted", time: "Driver", active: true },
                { label: "Handover verified", time: "Code", active: true },
                { label: "Admin review available", time: selected.status },
              ]}
            />
          </div>
        </Panel>
      </div>
    </main>
  );
}

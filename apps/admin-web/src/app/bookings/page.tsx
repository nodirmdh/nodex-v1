import { Badge, Button, Panel, Timeline, formatUzs } from "@nodex/ui";

const bookings = [
  {
    id: "booking-confirmed",
    route: "Nukus to Urgench",
    client: "A. Karimov",
    driver: "Phase Driver",
    seats: ["Front", "1L"],
    status: "BOARDING",
    payment: "Cash",
    totalMinor: 17000000,
    createdAt: "2026-08-01 09:04 UTC",
  },
  {
    id: "booking-progress",
    route: "Nukus to Khiva",
    client: "M. Seitov",
    driver: "Route partner",
    seats: ["1R"],
    status: "IN_PROGRESS",
    payment: "Manual transfer",
    totalMinor: 9500000,
    createdAt: "2026-08-01 09:10 UTC",
  },
  {
    id: "booking-no-show",
    route: "Nukus to Bukhara",
    client: "D. Allamuratov",
    driver: "Verified driver",
    seats: ["2R"],
    status: "NO_SHOW_CLIENT",
    payment: "Cash",
    totalMinor: 18000000,
    createdAt: "2026-08-01 08:44 UTC",
  },
];

function tone(status: string) {
  if (status === "CONFIRMED" || status === "COMPLETED") return "success";
  if (status === "BOARDING" || status === "IN_PROGRESS") return "info";
  if (status.startsWith("NO_SHOW") || status.startsWith("CANCELLED")) return "danger";
  if (status === "HOLD") return "warning";
  return "info";
}

export default function BookingsPage() {
  const selected = bookings[0]!;

  return (
    <main className="space-y-4 p-5">
      <Panel className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="m-0 text-lg font-black">Booking operations</h1>
            <div className="text-sm text-slate-500">
              Holds, boarding, in-progress trips, no-shows, cancellations, and audit history.
            </div>
          </div>
          <Badge tone="info">{bookings.length} records</Badge>
        </div>
        <div className="grid grid-cols-4 gap-2 text-sm">
          <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
            <strong>2</strong>
            <span className="block text-slate-500">Operational</span>
          </div>
          <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
            <strong>1</strong>
            <span className="block text-slate-500">Boarding</span>
          </div>
          <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
            <strong>1</strong>
            <span className="block text-slate-500">No-show</span>
          </div>
          <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
            <strong>{formatUzs(26500000)}</strong>
            <span className="block text-slate-500">Cash/manual</span>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm" aria-label="Admin booking list">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="p-2">Booking</th>
                <th className="p-2">Client</th>
                <th className="p-2">Driver</th>
                <th className="p-2">Seats</th>
                <th className="p-2">Payment</th>
                <th className="p-2">Status</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-t border-[rgb(var(--border))]">
                  <td className="p-2">
                    <strong>{booking.route}</strong>
                    <span className="block text-xs text-slate-500">{booking.createdAt}</span>
                  </td>
                  <td className="p-2">{booking.client}</td>
                  <td className="p-2">{booking.driver}</td>
                  <td className="p-2">{booking.seats.join(", ")}</td>
                  <td className="p-2">
                    {booking.payment}
                    <span className="block text-xs text-slate-500">
                      {formatUzs(booking.totalMinor)}
                    </span>
                  </td>
                  <td className="p-2">
                    <Badge tone={tone(booking.status)}>{booking.status}</Badge>
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

        <Panel className="space-y-4" aria-label="Booking detail panel">
          <div>
            <h2 className="m-0 text-base font-bold">Selected booking</h2>
            <p className="m-0 text-sm text-slate-500">
              {selected.client} - {selected.route}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {selected.seats.map((seat) => (
              <Badge key={seat}>{seat}</Badge>
            ))}
            <Badge tone={tone(selected.status)}>{selected.status}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary">
              Admin cancel
            </Button>
            <Button type="button" variant="secondary">
              View operations
            </Button>
          </div>
          <div>
            <h3 className="m-0 mb-3 text-sm font-bold">Timeline</h3>
            <Timeline
              items={[
                { label: "Hold created", time: "09:01", active: true },
                { label: "Passenger details saved", time: "09:03", active: true },
                { label: "Booking confirmed", time: "09:04", active: true },
                { label: "Boarding code generated", time: "09:10", active: true },
                { label: "Operational status updated", time: selected.status },
              ]}
            />
          </div>
        </Panel>
      </div>
    </main>
  );
}

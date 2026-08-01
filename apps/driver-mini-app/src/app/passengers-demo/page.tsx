import { AppHeader, Badge, BottomNav, Button, Panel, Timeline, formatUzs } from "@nodex/ui";

const bookings = [
  {
    id: "booking-1",
    passenger: "A. Karimov",
    status: "CONFIRMED",
    seats: ["Front", "1L"],
    payment: "Cash",
    totalMinor: 17000000,
  },
  {
    id: "booking-2",
    passenger: "M. Seitov",
    status: "HOLD",
    seats: ["1R"],
    payment: "Manual transfer",
    totalMinor: 8500000,
  },
  {
    id: "booking-3",
    passenger: "D. Allamuratov",
    status: "PENDING_CONFIRMATION",
    seats: ["2R"],
    payment: "Cash",
    totalMinor: 8500000,
  },
];

export default function PassengersDemo() {
  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="Bookings" subtitle="Passenger seats and requests" />
      <div className="space-y-4 px-4">
        <Panel className="space-y-3" aria-label="Driver booking summary">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="m-0 text-xl font-black">Nukus to Urgench</h1>
              <p className="m-0 text-sm text-slate-500">5 seats В· 3 booking records</p>
            </div>
            <Badge tone="success">Published</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div
              className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3"
              aria-label="Booked seats"
            >
              <strong>3</strong>
              <span className="block text-xs text-slate-500">Booked</span>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
              <strong>1</strong>
              <span className="block text-xs text-slate-500">Held</span>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
              <strong>1</strong>
              <span className="block text-xs text-slate-500">Free</span>
            </div>
          </div>
        </Panel>

        <section aria-label="Driver booking list" className="space-y-3">
          {bookings.map((booking) => (
            <Panel key={booking.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="m-0 text-base font-bold">{booking.passenger}</h2>
                  <p className="m-0 text-sm text-slate-500">
                    {booking.payment} В· {formatUzs(booking.totalMinor)}
                  </p>
                </div>
                <Badge tone={booking.status === "CONFIRMED" ? "success" : "warning"}>
                  {booking.status}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {booking.seats.map((seat) => (
                  <Badge key={seat}>{seat}</Badge>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {booking.status === "PENDING_CONFIRMATION" ? (
                  <>
                    <Button type="button">Approve</Button>
                    <Button type="button" variant="secondary">
                      Reject
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="button" variant="secondary">
                      View details
                    </Button>
                    <Button type="button" variant="secondary">
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </Panel>
          ))}
        </section>

        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Booking history</h2>
          <Timeline
            items={[
              { label: "Seat hold created", time: "09:01", active: true },
              { label: "Booking confirmed", time: "09:04", active: true },
              { label: "Driver notified", time: "09:04", active: true },
            ]}
          />
        </Panel>
      </div>
      <BottomNav
        items={[
          { label: "Home" },
          { label: "Trips" },
          { label: "Bookings", active: true },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}

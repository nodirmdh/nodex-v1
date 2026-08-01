import Link from "next/link";
import { AppHeader, Badge, BottomNav, Panel, formatUzs } from "@nodex/ui";

const bookings = [
  {
    id: "phase6-booking-confirmed",
    route: "Nukus to Urgench",
    departure: "08:30",
    status: "BOARDING",
    seats: ["Front", "1L"],
    totalMinor: 17000000,
    paymentMethod: "Cash to driver",
    nextAction: "Show boarding code",
  },
  {
    id: "phase6-booking-hold",
    route: "Nukus to Khiva",
    departure: "09:00",
    status: "IN_PROGRESS",
    seats: ["1R"],
    totalMinor: 9500000,
    paymentMethod: "Manual transfer",
    nextAction: "Track trip status",
  },
];

export default function MyBookingsPage() {
  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="My bookings" subtitle="Seats, boarding, and trip progress" />
      <div className="space-y-4 px-4">
        <section aria-label="Client bookings" className="space-y-3">
          {bookings.map((booking) => (
            <Panel key={booking.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="m-0 text-base font-bold">{booking.route}</h1>
                  <p className="m-0 text-sm text-slate-500">
                    {booking.departure} - {booking.paymentMethod}
                  </p>
                </div>
                <Badge tone={booking.status === "BOARDING" ? "warning" : "info"}>
                  {booking.status}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {booking.seats.map((seat) => (
                  <Badge key={seat}>{seat}</Badge>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3">
                <strong>{formatUzs(booking.totalMinor)}</strong>
                <span className="text-xs font-semibold text-slate-500">{booking.nextAction}</span>
                <Link
                  className="text-sm font-semibold text-[rgb(var(--primary))]"
                  href={`/bookings/${booking.id}`}
                >
                  Details
                </Link>
              </div>
            </Panel>
          ))}
        </section>
      </div>
      <BottomNav
        items={[
          { label: "Home" },
          { label: "Search" },
          { label: "Bookings", active: true },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}

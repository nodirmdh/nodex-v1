import Link from "next/link";
import { AppHeader, Badge, BottomNav, Panel, formatUzs } from "@nodex/ui";

const bookings = [
  {
    id: "phase6-booking-confirmed",
    route: "Nukus to Urgench",
    departure: "08:30",
    status: "CONFIRMED",
    seats: ["Front", "1L"],
    totalMinor: 17000000,
    paymentMethod: "Cash to driver",
  },
  {
    id: "phase6-booking-hold",
    route: "Nukus to Khiva",
    departure: "09:00",
    status: "HOLD",
    seats: ["1R"],
    totalMinor: 9500000,
    paymentMethod: "Manual transfer",
  },
];

export default function MyBookingsPage() {
  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="My bookings" subtitle="Seats, holds, and trip details" />
      <div className="space-y-4 px-4">
        <section aria-label="Client bookings" className="space-y-3">
          {bookings.map((booking) => (
            <Panel key={booking.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="m-0 text-base font-bold">{booking.route}</h1>
                  <p className="m-0 text-sm text-slate-500">
                    {booking.departure} В· {booking.paymentMethod}
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
              <div className="flex items-center justify-between">
                <strong>{formatUzs(booking.totalMinor)}</strong>
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

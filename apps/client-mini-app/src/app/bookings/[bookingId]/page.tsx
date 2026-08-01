import Link from "next/link";
import { AppHeader, Badge, BottomNav, Button, Panel, Timeline, formatUzs } from "@nodex/ui";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;

  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="Booking detail" subtitle={bookingId} />
      <div className="space-y-4 px-4">
        <Panel className="space-y-3" aria-label="Booking summary">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="m-0 text-xl font-black">Nukus to Urgench</h1>
              <p className="m-0 text-sm text-slate-500">08:30 В· Cash to driver</p>
            </div>
            <Badge tone="success">CONFIRMED</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>Front</Badge>
            <Badge>1L</Badge>
            <Badge tone="info">{formatUzs(17000000)}</Badge>
          </div>
        </Panel>

        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Booking timeline</h2>
          <Timeline
            items={[
              { label: "Seat hold created", time: "08:01", active: true },
              { label: "Passenger details added", time: "08:03", active: true },
              { label: "Booking confirmed", time: "08:04", active: true },
            ]}
          />
        </Panel>

        <Panel className="space-y-3">
          <h2 className="m-0 text-base font-bold">Passenger actions</h2>
          <Button className="w-full" type="button" variant="secondary">
            Cancel booking
          </Button>
          <Link
            className="block text-center text-sm font-semibold text-[rgb(var(--primary))]"
            href="/bookings"
          >
            Back to bookings
          </Link>
        </Panel>
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

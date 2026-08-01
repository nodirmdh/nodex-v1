import Link from "next/link";
import { AppHeader, Badge, BottomNav, Button, Panel, Timeline, formatUzs } from "@nodex/ui";

const operationStatus = {
  tripStatus: "BOARDING",
  bookingStatus: "BOARDING",
  boardingCode: "482913",
  codeExpiresAt: "10:25",
  seat: "Front, 1L",
  pickupPoint: "Nukus Central Station",
  driver: "Driver Mock",
  vehicle: "Chevrolet Cobalt",
  plannedArrival: "10:20",
};

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
              <p className="m-0 text-sm text-slate-500">08:30 - Cash to driver</p>
            </div>
            <Badge tone="info">{operationStatus.tripStatus}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{operationStatus.bookingStatus}</Badge>
            <Badge>{operationStatus.seat}</Badge>
            <Badge tone="info">{formatUzs(17000000)}</Badge>
          </div>
        </Panel>

        <Panel className="space-y-3" aria-label="Boarding state">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="m-0 text-base font-bold">Boarding code</h2>
              <p className="m-0 text-sm text-slate-500">
                Show this code to the driver at {operationStatus.pickupPoint}
              </p>
            </div>
            <Badge tone="warning">Expires {operationStatus.codeExpiresAt}</Badge>
          </div>
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center text-3xl font-black tracking-[0.28em] text-slate-950">
            {operationStatus.boardingCode}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="block text-slate-500">Driver</span>
              <strong>{operationStatus.driver}</strong>
            </div>
            <div>
              <span className="block text-slate-500">Vehicle</span>
              <strong>{operationStatus.vehicle}</strong>
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" type="button" variant="secondary">
              Copy code
            </Button>
            <Button className="flex-1" type="button" variant="secondary">
              Regenerate
            </Button>
          </div>
        </Panel>

        <Panel className="space-y-2" aria-label="Trip operation status">
          <h2 className="m-0 text-base font-bold">Trip status</h2>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Boarding</span>
              <Badge tone="info">Code active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">In progress</span>
              <span>{operationStatus.plannedArrival}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Completed</span>
              <span>Summary ready after arrival</span>
            </div>
          </div>
        </Panel>

        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Booking timeline</h2>
          <Timeline
            items={[
              { label: "Seat hold created", time: "08:01", active: true },
              { label: "Passenger details added", time: "08:03", active: true },
              { label: "Booking confirmed", time: "08:04", active: true },
              { label: "Boarding code generated", time: "08:10", active: true },
            ]}
          />
        </Panel>

        <Panel className="space-y-3">
          <h2 className="m-0 text-base font-bold">Passenger actions</h2>
          <p className="m-0 text-sm text-slate-500">
            Cancelled and no-show states will show the public reason and next available action.
            Review is prepared for a later phase.
          </p>
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

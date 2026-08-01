import Link from "next/link";
import {
  AppHeader,
  Badge,
  BottomNav,
  Button,
  Panel,
  Timeline,
  VehicleSummary,
  formatUzs,
} from "@nodex/ui";

const tripDetails = {
  "phase5-nukus-urgench-morning": {
    route: "Nukus to Urgench",
    departure: "08:30",
    arrival: "11:30",
    priceMinor: 8500000,
    seats: 4,
    driver: "Phase Driver",
    reliability: 96,
    vehicle: "Chevrolet Tracker",
    parcel: true,
  },
  "phase5-nukus-urgench-evening": {
    route: "Nukus to Urgench",
    departure: "18:10",
    arrival: "21:05",
    priceMinor: 9200000,
    seats: 2,
    driver: "Verified driver",
    reliability: 91,
    vehicle: "Chevrolet Cobalt",
    parcel: false,
  },
  "phase5-nukus-khiva": {
    route: "Nukus to Khiva",
    departure: "09:00",
    arrival: "12:30",
    priceMinor: 9500000,
    seats: 3,
    driver: "Route partner",
    reliability: 94,
    vehicle: "BYD Chazor",
    parcel: true,
  },
};

export default async function PublicTripPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const trip =
    tripDetails[tripId as keyof typeof tripDetails] ?? tripDetails["phase5-nukus-urgench-morning"];

  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="Trip details" subtitle={trip.route} />
      <div className="space-y-4 px-4">
        <Panel className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="m-0 text-xl font-black">{trip.route}</h1>
              <p className="m-0 text-sm text-slate-500">
                {trip.departure} - {trip.arrival} · Asia/Tashkent
              </p>
            </div>
            <Badge tone="success">{trip.seats} seats</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">Approved driver</Badge>
            <Badge tone="info">Approved vehicle</Badge>
            {trip.parcel ? <Badge>Parcel</Badge> : null}
          </div>
        </Panel>

        <VehicleSummary />

        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="m-0 text-base font-bold">Route timeline</h2>
            <Badge tone="info">Public preview</Badge>
          </div>
          <Timeline
            items={[
              { label: "Nukus bus station", time: trip.departure, active: true },
              { label: "Comfort stop", time: "10:00" },
              { label: trip.route.split(" to ")[1] + " bus station", time: trip.arrival },
            ]}
          />
        </Panel>

        <Panel className="space-y-3">
          <h2 className="m-0 text-base font-bold">Driver and price</h2>
          <div className="flex justify-between text-sm">
            <span>{trip.driver}</span>
            <span>{trip.reliability}% reliability</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{trip.vehicle}</span>
            <span>{formatUzs(trip.priceMinor)}</span>
          </div>
        </Panel>

        <Panel className="space-y-3">
          <h2 className="m-0 text-base font-bold">Next step</h2>
          <p className="m-0 text-sm text-slate-500">
            Booking opens in a later phase. This action only records client intent for the MVP.
          </p>
          <Button className="w-full" type="button">
            Request booking
          </Button>
          <Link
            className="block text-center text-sm font-semibold text-[rgb(var(--primary))]"
            href="/search"
          >
            Back to search
          </Link>
        </Panel>
      </div>
      <BottomNav
        items={[
          { label: "Home" },
          { label: "Search" },
          { label: "Trip", active: true },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}

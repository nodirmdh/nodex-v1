import { Badge, Button, Panel, PriceBreakdown, SeatMap, TripCard } from "@nodex/ui";

export default function DesignSystemPage() {
  return (
    <main className="space-y-5 p-5">
      <Panel>
        <h1 className="m-0 text-lg font-black">Design system preview</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Badge tone="success">Success</Badge>
          <Badge tone="warning">Warning</Badge>
          <Badge tone="danger">Danger</Badge>
        </div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-3">
        <TripCard
          origin="Nukus"
          destination="Urgench"
          departure="08:30"
          arrival="11:20"
          duration="2h 50m"
          driver="Driver A."
          rating={4.9}
          reliability={96}
          car="Chevrolet Cobalt"
          amenities={["AC", "No smoking"]}
          seatsLeft={3}
          priceMinor={8500000}
        />
        <Panel>
          <SeatMap />
        </Panel>
        <PriceBreakdown />
      </div>
    </main>
  );
}

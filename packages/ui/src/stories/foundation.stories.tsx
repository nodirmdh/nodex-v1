import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  AppHeader,
  Badge,
  BottomNav,
  Button,
  DriverSummary,
  EmptyState,
  Panel,
  PriceBreakdown,
  RouteSearch,
  SeatMap,
  Skeleton,
  Timeline,
  TripCard,
  VehicleSummary,
} from "../index";

const meta: Meta = {
  title: "Nodex/Foundation",
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj;

export const ButtonsAndBadges: Story = {
  render: () => (
    <div className="space-y-4 p-6">
      <div className="flex gap-2">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
      <div className="flex gap-2">
        <Badge>Neutral</Badge>
        <Badge tone="success">Success</Badge>
        <Badge tone="warning">Warning</Badge>
        <Badge tone="danger">Danger</Badge>
        <Badge tone="info">Info</Badge>
      </div>
    </div>
  ),
};

export const TravelComponents: Story = {
  render: () => (
    <div className="w-[360px] space-y-4 p-4">
      <AppHeader title="Nodex" subtitle="Intercity trips" />
      <RouteSearch />
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
        amenities={["AC", "No smoking", "Parcel"]}
        seatsLeft={3}
        priceMinor={8500000}
      />
      <SeatMap />
      <PriceBreakdown />
      <BottomNav
        items={[
          { label: "Home", active: true },
          { label: "Search" },
          { label: "Chat" },
          { label: "Profile" },
        ]}
      />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="w-[420px] space-y-4 p-4">
      <EmptyState title="No trips yet" body="Try nearby dates or subscribe to this route." />
      <Panel className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-20 w-full" />
      </Panel>
      <Panel>
        <Timeline
          items={[
            { label: "Booking created", time: "10:10", active: true },
            { label: "Driver confirmed", time: "10:12" },
            { label: "Boarding", time: "16:30" },
          ]}
        />
      </Panel>
    </div>
  ),
};

export const DriverAndVehicle: Story = {
  render: () => (
    <div className="w-[360px] space-y-4 p-4">
      <DriverSummary />
      <VehicleSummary />
      <SeatMap compact />
    </div>
  ),
};

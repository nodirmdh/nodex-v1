import {
  AppHeader,
  Badge,
  BottomNav,
  EmptyState,
  RouteSearch,
  Skeleton,
  TripCard,
} from "@nodex/ui";
import { mockTrips } from "@nodex/testing";

export default function HomePage() {
  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="Nodex" subtitle="Intercity trips and parcels" />
      <div className="space-y-4 px-4">
        <RouteSearch />
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="m-0 text-sm font-bold">Quick filters</h2>
            <Badge tone="info">Mock mode</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Today", "AC", "Parcel", "Women only", "No smoking"].map((filter) => (
              <Badge key={filter}>{filter}</Badge>
            ))}
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="m-0 text-sm font-bold">Recommended</h2>
          {mockTrips.map((trip) => (
            <TripCard key={trip.id} {...trip} />
          ))}
        </section>
        <EmptyState
          title="No Telegram environment"
          body="The shell also supports a safe browser preview mode for local development."
        />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>
      <BottomNav
        items={[
          { label: "Home", active: true },
          { label: "Search" },
          { label: "Trip" },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}

import { AppHeader, BottomNav, EmptyState, RouteSearch, TripCard } from "@nodex/ui";
import { mockTrips } from "@nodex/testing";

export default function SearchPage() {
  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="Search" subtitle="Find a reliable route" />
      <div className="space-y-4 px-4">
        <RouteSearch />
        {mockTrips.map((trip) => (
          <TripCard key={trip.id} {...trip} />
        ))}
        <EmptyState
          title="No exact match"
          body="Nearby cities, adjacent dates, and route subscriptions will appear here."
        />
      </div>
      <BottomNav
        items={[
          { label: "Home" },
          { label: "Search", active: true },
          { label: "Trip" },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}

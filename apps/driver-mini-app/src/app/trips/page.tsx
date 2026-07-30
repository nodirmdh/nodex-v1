import { AppHeader, BottomNav, DriverSummary, EmptyState } from "@nodex/ui";

export default function TripsPage() {
  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="Trips" subtitle="Upcoming and drafts" />
      <div className="space-y-4 px-4">
        <DriverSummary />
        <EmptyState
          title="Draft templates"
          body="Saved route templates and recurring trips will appear here."
        />
      </div>
      <BottomNav
        items={[
          { label: "Home" },
          { label: "Trips", active: true },
          { label: "Create" },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}

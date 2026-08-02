import { AppHeader, Badge, BottomNav, Button, Panel, Timeline } from "@nodex/ui";

export default function ClientReviewsPage() {
  return (
    <main className="nodex-app mobile-shell pb-20">
      <AppHeader title="Reviews" subtitle="Trip and parcel feedback" />
      <div className="space-y-4 px-4">
        <Panel className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="m-0 text-lg font-black">Rate your completed delivery</h1>
              <div className="text-sm text-slate-500">Parcel delivered by Driver Mock</div>
            </div>
            <Badge tone="success">Available</Badge>
          </div>
          <div className="grid grid-cols-5 gap-2" aria-label="Overall rating">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                className="min-h-11 rounded-[var(--radius-md)] border border-[rgb(var(--border))] text-sm font-black"
                type="button"
              >
                {rating}
              </button>
            ))}
          </div>
          <Button className="min-h-11">Submit review</Button>
        </Panel>
        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Review history</h2>
          <Timeline
            items={[
              { label: "Review window opened", time: "After delivery", active: true },
              { label: "Careful handling score saved", time: "Seed" },
              { label: "Driver aggregate updated", time: "Worker" },
            ]}
          />
        </Panel>
      </div>
      <BottomNav
        items={[
          { label: "Home" },
          { label: "Search" },
          { label: "Reviews", active: true },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}

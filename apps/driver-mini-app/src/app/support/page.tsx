import { DriverCard, DriverHeader, DriverPill, DriverShell } from "../driver-ui";

const categories = [
  "Trip problem",
  "Passenger issue",
  "Vehicle issue",
  "Verification",
  "Subscription",
  "Parcel",
  "Safety",
  "Other",
];

export default function DriverSupportPage() {
  return (
    <DriverShell active="profile">
      <DriverHeader
        title="Support"
        subtitle="Driver help for active work"
        status={<DriverPill tone="warning">1 open</DriverPill>}
      />

      <DriverCard className="mt-4 space-y-3" label="Driver support ticket">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="m-0 text-xl font-black">Parcel handover question</h1>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Connected to active parcel and trip timeline.
            </p>
          </div>
          <DriverPill tone="warning">Waiting</DriverPill>
        </div>
        <button
          className="min-h-11 w-full rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))]"
          type="button"
        >
          Contact support
        </button>
      </DriverCard>

      <DriverCard className="mt-3 space-y-3" label="Driver support categories">
        <h2 className="m-0 text-lg font-black">Create support request</h2>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((category) => (
            <button
              key={category}
              className="min-h-11 rounded-[16px] border-0 bg-[rgb(var(--canvas))] px-3 text-left text-xs font-black"
              type="button"
            >
              {category}
            </button>
          ))}
        </div>
      </DriverCard>

      <DriverCard className="mt-3 space-y-2" label="Support activity">
        <h2 className="m-0 text-lg font-black">Recent activity</h2>
        <div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3 text-sm font-semibold text-[rgb(var(--text-muted))]">
          Support replied · Today 14:20
        </div>
      </DriverCard>
    </DriverShell>
  );
}

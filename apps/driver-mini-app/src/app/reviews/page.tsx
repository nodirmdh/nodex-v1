import { DriverCard, DriverHeader, DriverPill, DriverShell } from "../driver-ui";

const reviews = [
  ["Nodex Client", "5.0", "Nukus → Urgench · 12 Aug", "Punctual driver and clear communication."],
  ["Parcel sender", "5.0", "Nukus → Khiva · 9 Aug", "Careful parcel handoff."],
];

export default function DriverReviewsPage() {
  return (
    <DriverShell active="profile">
      <DriverHeader
        title="Reviews"
        subtitle="Reputation from completed work"
        status={<DriverPill tone="success">4.9</DriverPill>}
      />

      <DriverCard className="mt-4 space-y-3" label="Driver review summary">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="m-0 text-xl font-black">Reliability profile</h1>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Passenger and sender feedback from completed trips.
            </p>
          </div>
          <DriverPill tone="success">Reliable</DriverPill>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Metric label="Rating" value="4.9" />
          <Metric label="Reviews" value="128" />
          <Metric label="Trips" value="268" />
        </div>
        <button
          className="min-h-11 w-full rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))]"
          type="button"
        >
          View received reviews
        </button>
      </DriverCard>

      <section aria-label="Driver review list" className="mt-3 space-y-3">
        {reviews.map(([name, rating, route, comment]) => (
          <DriverCard key={name} className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-base font-black">{name}</h2>
                <p className="m-0 text-xs font-semibold text-[rgb(var(--text-muted))]">{route}</p>
              </div>
              <DriverPill tone="accent">{rating}</DriverPill>
            </div>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">“{comment}”</p>
          </DriverCard>
        ))}
      </section>
    </DriverShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3">
      <div className="text-lg font-black">{value}</div>
      <div className="text-[10px] font-bold text-[rgb(var(--text-muted))]">{label}</div>
    </div>
  );
}

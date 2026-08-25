import Link from "next/link";
import { DriverCard, DriverHeader, DriverIconView, DriverPill, DriverShell } from "../driver-ui";

export default function DriverSafetyPage() {
  return (
    <DriverShell active="profile">
      <DriverHeader
        title="Safety"
        subtitle="Trip incidents and emergency help"
        status={<DriverPill tone="info">Monitored</DriverPill>}
      />

      <DriverCard className="mt-4 space-y-3" label="Driver safety center">
        <div className="flex gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]">
            <DriverIconView name="shield" />
          </span>
          <div>
            <h1 className="m-0 text-xl font-black">Driver safety center</h1>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Report passenger issues, trip incidents, or contact support during a trip.
            </p>
          </div>
        </div>
      </DriverCard>

      <DriverCard className="mt-3 space-y-2" label="Current trip safety">
        <h2 className="m-0 text-lg font-black">Current trip</h2>
        {["Report passenger", "Report trip incident", "Contact support"].map((action) => (
          <button
            key={action}
            className="min-h-11 w-full rounded-[16px] border-0 bg-[rgb(var(--canvas))] px-3 text-left text-sm font-black"
            type="button"
          >
            {action}
          </button>
        ))}
      </DriverCard>

      <DriverCard className="mt-3 space-y-3" label="Emergency help">
        <h2 className="m-0 text-lg font-black">Emergency help</h2>
        <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
          Use only for urgent safety situations.
        </p>
        <Link
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[rgb(var(--destructive))] px-4 text-sm font-black text-white no-underline"
          href="/safety/sos"
        >
          Open emergency actions
        </Link>
      </DriverCard>
    </DriverShell>
  );
}

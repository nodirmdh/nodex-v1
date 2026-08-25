import Link from "next/link";
import { Card, ClientHeader, ClientShell, Icon, StatusPill } from "../client-ui";

export default function TripDemoPage() {
  return (
    <ClientShell active="trips">
      <ClientHeader title="Trip preview" subtitle="Internal route kept for compatibility" />
      <Card className="mt-5 space-y-4">
        <StatusPill tone="accent">Internal preview</StatusPill>
        <h1 className="m-0 text-2xl font-black">Use the live trip detail screen</h1>
        <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
          This route remains available for smoke coverage. Product navigation uses Trips and Trip
          details instead.
        </p>
        <div aria-label="Route timeline" className="grid gap-3">
          <h2 className="m-0 text-lg font-black">Route timeline</h2>
          {[
            ["Nukus Central Station", "08:30"],
            ["Comfort stop", "10:00"],
            ["Urgench Bus Station", "11:30"],
          ].map(([label, time], index) => (
            <div key={label} className="grid grid-cols-[20px_1fr_auto] gap-3">
              <span
                className={
                  index === 0
                    ? "mt-1 h-3 w-3 rounded-full bg-[rgb(var(--primary))]"
                    : "mt-1 h-3 w-3 rounded-full bg-[rgb(var(--border-strong))]"
                }
              />
              <span className="text-sm font-black">{label}</span>
              <span className="text-sm font-bold text-[rgb(var(--text-muted))]">{time}</span>
            </div>
          ))}
        </div>
        <Link
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline"
          href="/trips/phase5-nukus-urgench-morning"
        >
          <Icon name="car" />
          Open trip detail
        </Link>
      </Card>
    </ClientShell>
  );
}

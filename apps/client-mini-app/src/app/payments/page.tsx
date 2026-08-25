import Link from "next/link";
import { Card, ClientHeader, ClientShell, Icon, StatusPill } from "../client-ui";

export default function ClientPaymentsPage() {
  return (
    <ClientShell active="profile">
      <ClientHeader backHref="/profile" title="Payments" subtitle="Legacy client payment surface" />

      <Card className="mt-5 space-y-4" label="Client payment legacy notice">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]">
            <Icon name="ticket" />
          </span>
          <div>
            <StatusPill tone="accent">Not in ride request flow</StatusPill>
            <h1 className="m-0 mt-3 text-xl font-black">Ride payments happen outside Nodex</h1>
            <p className="m-0 mt-2 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Clients send seat requests. The listed ride price is informational, and payment is
              arranged directly with the driver.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline"
            href="/bookings"
          >
            View trips
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--canvas))] px-4 text-sm font-black text-[rgb(var(--primary))] no-underline"
            href="/support"
          >
            Contact support
          </Link>
        </div>
      </Card>
    </ClientShell>
  );
}

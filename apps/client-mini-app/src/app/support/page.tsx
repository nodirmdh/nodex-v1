import Link from "next/link";
import { Card, ClientHeader, ClientShell, StatusPill } from "../client-ui";

const categories = [
  { label: "Trip problem", href: "/messages/support-ticket?topic=trip" },
  { label: "Driver issue", href: "/messages/support-ticket?topic=driver" },
  { label: "Lost item", href: "/messages/support-ticket?topic=lost-item" },
  { label: "Parcel problem", href: "/parcels" },
  { label: "Safety concern", href: "/safety/sos" },
  { label: "Other", href: "/messages/support-ticket?topic=other" },
];

export default function ClientSupportPage() {
  return (
    <ClientShell active="profile">
      <ClientHeader
        backHref="/profile"
        level="secondary"
        title="Support"
        subtitle="Tickets and help topics"
      />

      <Card className="mt-4 space-y-2.5" compact>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-black">Open ticket</h2>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Pickup coordination for Nukus to Urgench.
            </p>
          </div>
          <StatusPill tone="info">In progress</StatusPill>
        </div>
        <div className="rounded-[18px] bg-[rgb(var(--canvas))] p-2.5 text-sm font-semibold text-[rgb(var(--text-muted))]">
          Support added your pickup note to the trip request. Driver chat remains available.
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline"
          href="/messages/support-ticket"
        >
          Contact support
        </Link>
      </Card>

      <Card className="mt-3" compact>
        <h2 className="m-0 mb-3 text-lg font-black">What do you need help with?</h2>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((category) => (
            <Link
              key={category.label}
              className="inline-flex min-h-11 items-center justify-center rounded-[18px] bg-[rgb(var(--surface-tint))] px-3 text-center text-sm font-black text-[rgb(var(--primary))] no-underline"
              href={category.href}
            >
              {category.label}
            </Link>
          ))}
        </div>
      </Card>

      <Card className="mt-3" compact>
        <h2 className="m-0 mb-3 text-lg font-black">Recent support activity</h2>
        <div className="grid gap-2.5">
          {[
            ["Ticket opened", "Today 08:10"],
            ["Support started review", "Today 08:14"],
            ["Driver note attached", "Today 08:18"],
          ].map(([title, time], index) => (
            <div key={title} className="grid grid-cols-[18px_1fr] gap-3">
              <span
                className={
                  index === 0
                    ? "mt-1 h-3 w-3 rounded-full bg-[rgb(var(--primary))]"
                    : "mt-1 h-3 w-3 rounded-full bg-[rgb(var(--border-strong))]"
                }
              />
              <div>
                <div className="text-sm font-black">{title}</div>
                <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">{time}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </ClientShell>
  );
}

import Link from "next/link";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "./admin-shell";

const metrics = [
  ["Active trips", "128", "Live now", "info"],
  ["Pending verification", "14", "Needs review", "warning"],
  ["Seat requests", "63", "Open today", "info"],
  ["Open support", "9", "Needs response", "warning"],
  ["Safety flags", "3", "Escalated", "danger"],
  ["Active subscriptions", "42", "Drivers", "success"],
] as const;

const attention = [
  ["Drivers awaiting verification", "8 pending submissions", "/verification", "Review queue"],
  ["Vehicles awaiting review", "5 documents ready", "/vehicles", "Open vehicles"],
  ["Support tickets needing response", "4 waiting over 2h", "/support", "Open support"],
  ["Safety cases", "3 active investigations", "/trust-safety", "Inspect cases"],
] as const;

export default function AdminDashboard() {
  return (
    <main className="p-5">
      <AdminPageHeader
        title="Dashboard"
        subtitle="Attention, live operations, and platform health."
        actions={
          <>
            <button className="min-h-9 rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm font-black">
              Export
            </button>
            <Link
              className="inline-flex min-h-9 items-center rounded-[10px] bg-[rgb(var(--primary))] px-3 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline"
              href="/drivers"
            >
              Open drivers
            </Link>
          </>
        }
      />

      <section className="grid gap-3 xl:grid-cols-6 lg:grid-cols-3 md:grid-cols-2">
        {metrics.map(([label, value, context, tone]) => (
          <AdminPanel key={label} className="p-3">
            <div className="text-xs font-bold text-[rgb(var(--text-muted))]">{label}</div>
            <div className="mt-1 text-2xl font-black">{value}</div>
            <div className="mt-2">
              <AdminStatusBadge tone={tone}>{context}</AdminStatusBadge>
            </div>
          </AdminPanel>
        ))}
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_0.9fr]">
        <AdminPanel className="overflow-hidden" label="Attention queue">
          <div className="border-b border-[rgb(var(--border))] px-4 py-3">
            <h2 className="m-0 text-base font-black">Attention queue</h2>
            <p className="m-0 mt-1 text-sm text-[rgb(var(--text-muted))]">
              Work that needs an operator decision first.
            </p>
          </div>
          <div className="divide-y divide-[rgb(var(--border))]">
            {attention.map(([title, detail, href, action], index) => (
              <Link
                key={title}
                className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 text-[rgb(var(--foreground))] no-underline hover:bg-[rgb(var(--surface-muted))]"
                href={href}
              >
                <span>
                  <span className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[rgb(var(--surface-tint))] text-xs font-black text-[rgb(var(--primary))]">
                      {index + 1}
                    </span>
                    <span className="font-black">{title}</span>
                  </span>
                  <span className="mt-1 block text-sm text-[rgb(var(--text-muted))]">{detail}</span>
                </span>
                <span className="rounded-[10px] bg-[rgb(var(--canvas))] px-3 py-2 text-sm font-black text-[rgb(var(--primary))]">
                  {action}
                </span>
              </Link>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel className="p-4" label="Live operations">
          <h2 className="m-0 text-base font-black">Live operations</h2>
          <div className="mt-3 grid gap-3">
            {[
              ["Upcoming departures", "34 within 6 hours", "info"],
              ["Parcels in transit", "18 active handoffs", "success"],
              ["Platform health", "API, Redis, storage ready", "success"],
            ].map(([title, detail, tone]) => (
              <div
                key={title}
                className="flex items-center justify-between gap-3 rounded-[12px] bg-[rgb(var(--canvas))] p-3"
              >
                <span>
                  <span className="block text-sm font-black">{title}</span>
                  <span className="block text-xs text-[rgb(var(--text-muted))]">{detail}</span>
                </span>
                <AdminStatusBadge tone={tone as "info"}>
                  {tone === "success" ? "OK" : "Watch"}
                </AdminStatusBadge>
              </div>
            ))}
          </div>
        </AdminPanel>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <AdminPanel className="p-4" label="Business snapshot">
          <h2 className="m-0 text-base font-black">Business snapshot</h2>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <SmallMetric label="Renewals" value="7" />
            <SmallMetric label="Expiring" value="5" />
            <SmallMetric label="Subscriptions" value="42" />
          </div>
        </AdminPanel>
        <AdminPanel className="p-4" label="Recent operational events">
          <h2 className="m-0 text-base font-black">Recent operational events</h2>
          <div className="mt-3 grid gap-2">
            {[
              ["Driver application approved", "09:24"],
              ["Trip published", "09:18"],
              ["Support escalated", "09:05"],
              ["Subscription activated", "08:52"],
            ].map(([event, time]) => (
              <div key={event} className="grid grid-cols-[1fr_auto] text-sm">
                <span className="font-semibold">{event}</span>
                <span className="text-[rgb(var(--text-muted))]">{time}</span>
              </div>
            ))}
          </div>
        </AdminPanel>
      </section>
    </main>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-[rgb(var(--canvas))] p-3">
      <div className="text-xl font-black">{value}</div>
      <div className="text-xs font-bold text-[rgb(var(--text-muted))]">{label}</div>
    </div>
  );
}

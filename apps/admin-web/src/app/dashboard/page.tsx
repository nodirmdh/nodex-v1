import Link from "next/link";
import { AdminPageHeader, AdminPanel } from "../admin-shell";
import { Status } from "../admin-components";

const cards = [
  ["Active trips", "18", "Live and boarding rides", "/trips"],
  ["Trips today", "64", "Departures scheduled today", "/trips"],
  ["Bookings today", "143", "Seat and whole-car requests", "/bookings"],
  ["Active drivers", "42", "Available or in trip", "/drivers"],
  ["Clients", "1,284", "Passenger accounts", "/users"],
  ["Open support", "9", "Needs operator response", "/support"],
  ["Fraud cases", "3", "Suspicious rewards or routes", "/fraud"],
  ["Pending rewards", "7", "Review before approval", "/rewards"],
  ["Waitlist matches", "12", "Demand matched to supply", "/matching"],
  ["Fill / Return", "21", "Driver activity signals", "/matching"],
] as const;

const events = [
  ["Support ticket escalated", "sup_9002", "/support/sup_9002", "Open"],
  ["Waitlist matched", "wait_6101", "/matching", "Matched"],
  ["Reward held for review", "rew_3003", "/rewards", "Pending"],
  ["Trip boarding started", "trip_7001", "/trips/trip_7001", "Boarding"],
] as const;

export default function DashboardPage() {
  return (
    <main className="admin-main">
      <AdminPageHeader title="Dashboard" subtitle="Compact operational overview. Open a section to work the queue." />
      <section className="grid gap-3 xl:grid-cols-5 lg:grid-cols-3 md:grid-cols-2">
        {cards.map(([label, value, detail, href]) => (
          <Link className="text-[rgb(var(--foreground))] no-underline" href={href} key={label}>
            <AdminPanel className="h-full p-4 transition hover:-translate-y-0.5 hover:border-[rgb(var(--primary))]">
              <div className="text-xs font-black uppercase text-[rgb(var(--text-muted))]">{label}</div>
              <div className="mt-1 text-3xl font-black">{value}</div>
              <div className="mt-2 text-sm font-semibold text-[rgb(var(--text-muted))]">{detail}</div>
            </AdminPanel>
          </Link>
        ))}
      </section>
      <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <AdminPanel className="overflow-hidden" label="Attention stream">
          <div className="border-b border-[rgb(var(--border))] px-4 py-3"><h2 className="m-0 text-base font-black">Attention stream</h2></div>
          <div className="divide-y divide-[rgb(var(--border))]">
            {events.map(([label, id, href, status]) => (
              <Link className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3 text-[rgb(var(--foreground))] no-underline hover:bg-[rgb(var(--surface-muted))]" href={href} key={id}>
                <span><span className="block font-black">{label}</span><span className="text-sm text-[rgb(var(--text-muted))]">{id}</span></span>
                <Status value={status} />
              </Link>
            ))}
          </div>
        </AdminPanel>
        <AdminPanel className="p-4" label="Operational health">
          <h2 className="m-0 text-base font-black">Operational health</h2>
          <div className="mt-3 grid gap-2">
            {["Client preview online", "Driver preview online", "Admin preview online", "API preview placeholder configured"].map((item) => (
              <div className="flex items-center justify-between rounded-[8px] bg-[rgb(var(--canvas))] p-3 text-sm" key={item}>
                <strong>{item}</strong><Status value="Active" />
              </div>
            ))}
          </div>
        </AdminPanel>
      </section>
    </main>
  );
}
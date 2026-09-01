import { AdminPageHeader, AdminPanel, AdminShell, AdminStatusBadge } from "../admin-shell";

const waitlist = [
  {
    user: "Client 900000003",
    route: "Nukus → Urgench",
    date: "2026-09-02",
    status: "ACTIVE",
    seats: "2",
  },
  {
    user: "Client 900000004",
    route: "Urgench → Nukus",
    date: "2026-09-03",
    status: "MATCHED",
    seats: "1",
  },
  {
    user: "Client 900000005",
    route: "Nukus → Khiva",
    date: "2026-09-01",
    status: "EXPIRED",
    seats: "3",
  },
];

const matches = [
  { waitlist: "WL-URGENCH-2", trip: "TRIP-NUK-URG-0830", state: "notified", created: "09:12" },
  { waitlist: "WL-RETURN-1", trip: "TRIP-URG-NUK-1800", state: "acted", created: "10:20" },
];

export default function MatchingAdminPage() {
  return (
    <AdminShell>
      <main className="p-5">
        <AdminPageHeader
          title="Matching"
          subtitle="Read-only visibility for waitlist, matches, favorites, saved routes, Fill, and Return signals."
        />

        <div className="grid gap-3 lg:grid-cols-4">
          {[
            { label: "Active waitlist", value: "18" },
            { label: "Matched today", value: "7" },
            { label: "Favorite drivers", value: "42" },
            { label: "Saved routes", value: "65" },
          ].map(({ label, value }) => (
            <AdminPanel key={label} className="p-4" label={label}>
              <div className="text-xs font-black uppercase tracking-[0.12em] text-[rgb(var(--text-muted))]">
                {label}
              </div>
              <div className="mt-2 text-3xl font-black">{value}</div>
            </AdminPanel>
          ))}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <AdminPanel className="overflow-hidden" label="Waitlist visibility">
            <div className="border-b border-[rgb(var(--border))] p-4">
              <h2 className="m-0 text-lg font-black">Waitlist</h2>
            </div>
            <div className="divide-y divide-[rgb(var(--border))]">
              {waitlist.map((row) => (
                <div
                  key={`${row.user}-${row.route}`}
                  className="grid gap-2 p-4 md:grid-cols-[1fr_1fr_110px_70px] md:items-center"
                >
                  <div className="text-sm font-black">{row.user}</div>
                  <div className="text-sm font-semibold text-[rgb(var(--text-muted))]">
                    {row.route} · {row.date}
                  </div>
                  <AdminStatusBadge
                    tone={
                      row.status === "MATCHED"
                        ? "success"
                        : row.status === "EXPIRED"
                          ? "warning"
                          : "info"
                    }
                  >
                    {row.status}
                  </AdminStatusBadge>
                  <div className="text-sm font-black">{row.seats} seats</div>
                </div>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel className="p-4" label="Match state visibility">
            <h2 className="m-0 text-lg font-black">Matches</h2>
            <div className="mt-3 grid gap-3">
              {matches.map((match) => (
                <div key={match.waitlist} className="rounded-[12px] bg-[rgb(var(--canvas))] p-3">
                  <div className="text-sm font-black">{match.waitlist}</div>
                  <div className="mt-1 text-xs font-semibold text-[rgb(var(--text-muted))]">
                    {match.trip}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <AdminStatusBadge tone={match.state === "acted" ? "success" : "info"}>
                      {match.state}
                    </AdminStatusBadge>
                    <span className="text-xs font-bold text-[rgb(var(--text-muted))]">
                      {match.created}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </AdminPanel>
        </div>
      </main>
    </AdminShell>
  );
}

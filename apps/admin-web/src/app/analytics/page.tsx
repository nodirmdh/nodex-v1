import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "../admin-shell";

const metrics = [
  ["Active drivers", "412", "+18 this week"],
  ["Active subscriptions", "389", "94% of active drivers"],
  ["Published trips", "1,284", "+7% week over week"],
  ["Seat requests", "3,820", "68% accepted"],
  ["Seat utilization", "72%", "Healthy"],
  ["Active routes", "39", "6 high-demand"],
  ["Parcels", "216", "18 open handoffs"],
  ["Safety cases", "9", "1 urgent"],
];

const demand: Array<[string, number, number, string]> = [
  ["Nukus → Urgench", 82, 74, "Balanced"],
  ["Nukus → Khiva", 64, 48, "More supply needed"],
  ["Tashkent → Samarkand", 76, 81, "Demand ahead"],
  ["Nukus → Bukhara", 38, 31, "Low supply"],
];

const renewalTrend: Array<[string, number, number]> = [
  ["Mon", 36, 12],
  ["Tue", 42, 10],
  ["Wed", 39, 14],
  ["Thu", 48, 9],
  ["Fri", 51, 11],
];

export default function AdminAnalyticsPage() {
  return (
    <main className="p-5">
      <AdminPageHeader
        title="Analytics"
        subtitle="Operations and business signals for supply, demand, subscriptions, support, parcels, and safety."
        actions={<AdminStatusBadge tone="success">Daily UTC</AdminStatusBadge>}
      />

      <div className="grid gap-4">
        <AdminPanel className="grid gap-2 p-4 sm:grid-cols-4" label="Analytics dashboard">
          {metrics.map(([label, value, note]) => (
            <div
              key={label}
              className="min-w-[140px] rounded-[12px] bg-[rgb(var(--surface-muted))] p-3"
            >
              <div className="text-xl font-black">{value}</div>
              <div className="text-sm font-bold">{label}</div>
              <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">{note}</div>
            </div>
          ))}
        </AdminPanel>

        <div className="grid gap-4 min-[1380px]:grid-cols-[1fr_1fr]">
          <AdminPanel className="p-4" label="Subscription renewal trend">
            <h2 className="m-0 mb-3 text-base font-black">Subscription renewal / expiry trend</h2>
            <div className="grid gap-3">
              {renewalTrend.map(([day, renewals, expiries]) => (
                <div
                  key={day}
                  className="grid grid-cols-[48px_1fr_52px] items-center gap-3 text-sm"
                >
                  <strong>{day}</strong>
                  <div className="grid gap-1">
                    <div className="h-3 rounded-full bg-[rgb(var(--surface-muted))]">
                      <div
                        className="h-full rounded-full bg-[rgb(var(--primary))]"
                        style={{ width: `${renewals}%` }}
                      />
                    </div>
                    <div className="h-2 rounded-full bg-[rgb(var(--surface-muted))]">
                      <div
                        className="h-full rounded-full bg-[rgb(var(--warning))]"
                        style={{ width: `${expiries * 3}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-right font-black">{renewals}</span>
                </div>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel className="p-4" label="Support and safety volume">
            <h2 className="m-0 mb-3 text-base font-black">Support and safety volume</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["Support open", "18", "warning"],
                ["Safety urgent", "1", "danger"],
                ["Parcel issues", "4", "info"],
              ].map(([label, value, tone]) => (
                <div key={label} className="rounded-[12px] bg-[rgb(var(--surface-muted))] p-3">
                  <AdminStatusBadge tone={tone as "warning" | "danger" | "info"}>
                    {label}
                  </AdminStatusBadge>
                  <div className="mt-3 text-2xl font-black">{value}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-[12px] border border-[rgb(var(--border))] p-3 text-sm text-[rgb(var(--text-muted))]">
              No speculative forecast: figures are operational snapshots for current queues and
              daily decisions.
            </div>
          </AdminPanel>
        </div>

        <AdminPanel className="overflow-hidden" label="Corridor performance">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-[11px] font-black uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">
                <th className="border-b border-[rgb(var(--border))] px-4 py-3">Route</th>
                <th className="border-b border-[rgb(var(--border))] px-4 py-3">Driver supply</th>
                <th className="border-b border-[rgb(var(--border))] px-4 py-3">Request demand</th>
                <th className="border-b border-[rgb(var(--border))] px-4 py-3">Signal</th>
              </tr>
            </thead>
            <tbody>
              {demand.map(([route, supply, request, signal]) => (
                <tr key={route} className="border-b border-[rgb(var(--border))]">
                  <td className="px-4 py-3 font-black">{route}</td>
                  <td className="px-4 py-3">{supply}</td>
                  <td className="px-4 py-3">{request}</td>
                  <td className="px-4 py-3">{signal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminPanel>
      </div>
    </main>
  );
}

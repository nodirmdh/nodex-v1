import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "../admin-shell";

const groups = [
  {
    title: "General",
    items: ["Admin workspace name", "Default timezone: UTC", "Operational day boundary"],
  },
  {
    title: "Driver access / subscription policy",
    items: [
      "Expired subscription blocks publishing trips",
      "Expired subscription blocks accepting new passenger requests",
      "Confirmed obligations remain available",
    ],
  },
  {
    title: "Trip operations",
    items: ["Publication validation errors", "Cancellation reasons", "Boarding status labels"],
  },
  {
    title: "Parcel rules",
    items: ["Allowed parcel categories", "Handoff code policy", "Issue reason taxonomy"],
  },
  {
    title: "Notifications",
    items: [
      "Telegram delivery fallback",
      "Support escalation alerts",
      "Subscription expiry reminders",
    ],
  },
  {
    title: "Safety",
    items: ["Case severity taxonomy", "Support handoff rules", "Audit visibility"],
  },
  {
    title: "Localization",
    items: ["Primary language", "Fallback language", "UZS display format"],
  },
  {
    title: "Admin preferences",
    items: ["Dense tables", "Pinned inspector", "UTC timestamps"],
  },
];

export default function DesignSystemPage() {
  return (
    <main className="p-5">
      <AdminPageHeader
        title="Settings"
        subtitle="Grouped operational configuration. UI-only future controls are labeled instead of pretending to be live."
        actions={<AdminStatusBadge tone="info">Admin preferences</AdminStatusBadge>}
      />

      <div className="grid gap-4 min-[1380px]:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map((group) => (
            <AdminPanel key={group.title} className="p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <h2 className="m-0 text-base font-black">{group.title}</h2>
                <AdminStatusBadge
                  tone={group.title.includes("preferences") ? "neutral" : "success"}
                >
                  Backed
                </AdminStatusBadge>
              </div>
              <div className="grid gap-2">
                {group.items.map((item) => (
                  <div
                    key={item}
                    className="flex min-h-10 items-center justify-between gap-3 rounded-[10px] bg-[rgb(var(--surface-muted))] px-3 text-sm"
                  >
                    <span>{item}</span>
                    <span className="h-2 w-2 rounded-full bg-[rgb(var(--primary))]" />
                  </div>
                ))}
              </div>
            </AdminPanel>
          ))}
        </div>

        <AdminPanel className="h-fit p-4" label="Settings detail">
          <h2 className="m-0 text-xl font-black">Driver subscription access</h2>
          <p className="m-0 mt-2 text-sm text-[rgb(var(--text-muted))]">
            Subscription expiry is an access rule, not an account ban. Drivers keep confirmed
            obligations and communication with confirmed passengers.
          </p>
          <div className="mt-4 grid gap-2 text-sm">
            {[
              ["Publish trips", "Requires active subscription"],
              ["Accept new requests", "Requires active subscription"],
              ["Finish confirmed trips", "Allowed after expiry"],
              ["Message confirmed passengers", "Allowed after expiry"],
              ["Profile and vehicle management", "Allowed after expiry"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between gap-4 rounded-[10px] border border-[rgb(var(--border))] px-3 py-2"
              >
                <span>{label}</span>
                <strong className="text-right">{value}</strong>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-[12px] bg-[rgb(var(--surface-muted))] p-3 text-sm text-[rgb(var(--text-muted))]">
            Future configuration controls should stay marked as UI-only until wired to config or
            API.
          </div>
        </AdminPanel>
      </div>
    </main>
  );
}

import Link from "next/link";
import { DriverCard, DriverHeader, DriverIconView, DriverPill, DriverShell } from "../driver-ui";

type ProfileGroup = { title: string; rows: Array<[string, string, string]> };

const groups: ProfileGroup[] = [
  {
    title: "Work",
    rows: [
      ["Subscription", "Active · 18 days left", "/subscription"],
      ["Vehicles", "Chevrolet Cobalt · approved", "/vehicles"],
      ["Verification", "Approved", "/verification"],
    ],
  },
  {
    title: "Performance",
    rows: [
      ["Reviews", "4.9 rating · 128 reviews", "/reviews"],
      ["Statistics", "Estimated ride revenue", "/earnings"],
    ],
  },
  {
    title: "Help & Safety",
    rows: [
      ["Safety", "Trip reports and emergency help", "/safety"],
      ["Support", "Open ticket · driver help", "/support"],
    ],
  },
  {
    title: "App",
    rows: [
      ["Notifications", "Seat requests and reminders", "/notifications"],
      ["Language", "English", "/profile"],
    ],
  },
];

export default function DriverProfile() {
  return (
    <DriverShell active="profile">
      <DriverHeader
        title="Profile"
        subtitle="Driver workspace and settings"
        status={<DriverPill tone="success">Verified</DriverPill>}
      />

      <DriverCard className="mt-4 space-y-3" label="Driver identity">
        <div className="flex gap-3">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[rgb(var(--surface-tint))] text-xl font-black text-[rgb(var(--primary))]">
            AD
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="m-0 text-xl font-black">Azizbek Driver</h1>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Chevrolet Cobalt · 95 A 214 QA
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <DriverPill tone="success">Approved</DriverPill>
              <DriverPill tone="accent">4.9 rating</DriverPill>
              <DriverPill tone="info">268 trips</DriverPill>
            </div>
          </div>
        </div>
      </DriverCard>

      {groups.map((group) => (
        <DriverCard key={group.title} className="mt-3 p-0" label={`Driver profile ${group.title}`}>
          <h2 className="m-0 px-3 pt-3 text-xs font-black uppercase tracking-[0.12em] text-[rgb(var(--primary))]">
            {group.title}
          </h2>
          <div className="mt-2 divide-y divide-[rgb(var(--border))]">
            {group.rows.map(([label, detail, href]) => (
              <Link
                key={label}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-3 text-[rgb(var(--foreground))] no-underline"
                href={href}
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[rgb(var(--canvas))] text-[rgb(var(--primary))]">
                  <DriverIconView
                    name={
                      label === "Vehicles"
                        ? "car"
                        : label === "Support" || label === "Notifications"
                          ? "chat"
                          : label === "Safety"
                            ? "shield"
                            : "briefcase"
                    }
                  />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black">{label}</span>
                  <span className="block truncate text-xs font-semibold text-[rgb(var(--text-muted))]">
                    {detail}
                  </span>
                </span>
                <span className="text-sm font-black text-[rgb(var(--text-muted))]">›</span>
              </Link>
            ))}
          </div>
        </DriverCard>
      ))}
    </DriverShell>
  );
}

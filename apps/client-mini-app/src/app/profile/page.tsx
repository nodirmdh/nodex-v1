import { Avatar, Card, ClientHeader, ClientShell, SettingsRow, StatusPill } from "../client-ui";

export default function ProfilePage() {
  return (
    <ClientShell active="profile">
      <ClientHeader title="Profile" subtitle="Account, help, and safety" />

      <Card className="mt-4">
        <div className="flex items-center gap-4">
          <Avatar name="Nodex User" />
          <div className="min-w-0 flex-1">
            <h2 className="m-0 truncate text-xl font-black">Nodex User</h2>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Client account
            </p>
            <div className="mt-2 flex gap-2">
              <StatusPill tone="success">Verified phone</StatusPill>
              <StatusPill tone="accent">4.9 rider</StatusPill>
            </div>
          </div>
        </div>
      </Card>

      <Card className="mt-3.5" compact>
        <h2 className="m-0 mb-2 text-xs font-black uppercase tracking-[0.12em] text-[rgb(var(--primary))]">
          Account
        </h2>
        <SettingsRow
          href="/profile"
          icon="profile"
          subtitle="Name, phone, contact details"
          title="Personal information"
        />
        <SettingsRow
          href="/profile"
          icon="check"
          subtitle="RU, UZ, KAA interface readiness"
          title="Language"
        />
      </Card>

      <Card className="mt-3.5" compact>
        <h2 className="m-0 mb-2 text-xs font-black uppercase tracking-[0.12em] text-[rgb(var(--primary))]">
          Trips
        </h2>
        <SettingsRow
          href="/reviews"
          icon="review"
          subtitle="Rate completed rides and drivers"
          title="Reviews"
        />
        <SettingsRow
          href="/notifications"
          icon="bell"
          subtitle="Trip requests, messages, support"
          title="Notifications"
        />
      </Card>

      <Card className="mt-3.5" compact>
        <h2 className="m-0 mb-2 text-xs font-black uppercase tracking-[0.12em] text-[rgb(var(--primary))]">
          Help and safety
        </h2>
        <SettingsRow
          href="/safety"
          icon="shield"
          subtitle="Trip sharing, reports, emergency help"
          title="Safety"
        />
        <SettingsRow
          href="/support"
          icon="help"
          subtitle="Open tickets and contact support"
          title="Support"
        />
      </Card>

      <Card className="mt-3.5" compact>
        <h2 className="m-0 mb-2 text-xs font-black uppercase tracking-[0.12em] text-[rgb(var(--primary))]">
          App
        </h2>
        <SettingsRow
          href="/profile"
          icon="star"
          subtitle="Privacy, app version, legal"
          title="Settings and about"
        />
      </Card>
    </ClientShell>
  );
}

import { AppHeader, Badge, BottomNav, Panel } from "@nodex/ui";
import { ClientAuthPanel } from "../auth-panel";

export default function ProfilePage() {
  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="Profile" subtitle="Language, saved routes, privacy" />
      <div className="space-y-4 px-4">
        <ClientAuthPanel />
        <Panel>
          <div className="text-lg font-bold">Local preview user</div>
          <div className="text-sm text-slate-500">Telegram auth disabled in browser preview</div>
        </Panel>
        <Panel className="flex flex-wrap gap-2">
          <Badge>RU</Badge>
          <Badge>UZ</Badge>
          <Badge>KAA</Badge>
          <Badge tone="info">Dark ready</Badge>
          <Badge tone="warning">Offline state ready</Badge>
        </Panel>
      </div>
      <BottomNav
        items={[
          { label: "Home" },
          { label: "Search" },
          { label: "Trip" },
          { label: "Profile", active: true },
        ]}
      />
    </main>
  );
}

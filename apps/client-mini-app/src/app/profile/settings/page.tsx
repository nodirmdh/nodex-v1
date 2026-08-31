import { Card, ClientHeader, ClientShell, SettingsRow, StatusPill } from "../../client-ui";

export default function SettingsPage() {
  return (
    <ClientShell active="profile">
      <ClientHeader
        backHref="/profile"
        level="secondary"
        title="Настройки"
        subtitle="Приватность, версия и документы"
      />

      <Card className="mt-4" compact>
        <SettingsRow
          href="/notifications"
          icon="bell"
          title="Уведомления"
          subtitle="Поездки, сообщения и поддержка"
        />
        <SettingsRow
          href="/safety"
          icon="shield"
          title="Приватность и безопасность"
          subtitle="Доступ к поездке и экстренная помощь"
        />
        <SettingsRow
          href="/support"
          icon="help"
          title="Помощь"
          subtitle="Открыть обращение в поддержку"
        />
      </Card>

      <Card className="mt-3 space-y-2" compact>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black">Nodex Client</div>
            <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">Preview build</div>
          </div>
          <StatusPill tone="accent">MVP</StatusPill>
        </div>
      </Card>
    </ClientShell>
  );
}

import { Card, ClientHeader, ClientShell, SettingsRow, StatusPill } from "../../client-ui";

export default function PersonalInfoPage() {
  return (
    <ClientShell active="profile">
      <ClientHeader
        backHref="/profile"
        level="secondary"
        title="Личная информация"
        subtitle="Имя, телефон и контакты"
      />

      <Card className="mt-4 space-y-3" compact>
        <div className="flex items-center justify-between gap-3 rounded-[20px] bg-[rgb(var(--canvas))] p-3">
          <div>
            <div className="text-xs font-bold text-[rgb(var(--text-muted))]">Имя</div>
            <div className="text-base font-black">Пользователь Nodex</div>
          </div>
          <StatusPill tone="success">Проверено</StatusPill>
        </div>
        <div className="rounded-[20px] bg-[rgb(var(--canvas))] p-3">
          <div className="text-xs font-bold text-[rgb(var(--text-muted))]">Телефон</div>
          <div className="text-base font-black">+998 ** *** ** **</div>
        </div>
        <div className="rounded-[20px] bg-[rgb(var(--surface-tint))] p-3 text-sm font-semibold text-[rgb(var(--text-muted))]">
          Контакт водителя открывается только после подтверждения заявки.
        </div>
      </Card>

      <Card className="mt-3" compact>
        <SettingsRow
          href="/support"
          icon="help"
          title="Изменить данные"
          subtitle="Обратитесь в поддержку, если данные неверные"
        />
      </Card>
    </ClientShell>
  );
}

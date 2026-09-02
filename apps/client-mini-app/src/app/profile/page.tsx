import { Avatar, Card, ClientHeader, ClientShell, SettingsRow, StatusPill } from "../client-ui";

export default function ProfilePage() {
  return (
    <ClientShell active="profile">
      <ClientHeader title="Профиль" subtitle="Аккаунт, помощь и безопасность" />

      <Card className="mt-4">
        <div className="flex items-center gap-4">
          <Avatar name="Пользователь Nodex" />
          <div className="min-w-0 flex-1"><h2 className="m-0 truncate text-xl font-black">Пользователь Nodex</h2><p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">Клиентский аккаунт</p><div className="mt-2 flex gap-2"><StatusPill tone="success">Телефон подтверждён</StatusPill><StatusPill tone="accent">Рейтинг 4.9</StatusPill></div></div>
        </div>
      </Card>

      <Card className="mt-3.5" compact>
        <div className="flex items-start justify-between gap-3"><div><h2 className="m-0 text-base font-black">Бонусы Nodex</h2><p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">Билеты начисляются после завершённой поездки и проверки маршрута.</p></div><StatusPill tone="accent">7 билетов</StatusPill></div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-black"><div className="rounded-[14px] bg-[rgb(var(--surface-muted))] p-3"><span className="block text-lg">5</span><span className="text-[rgb(var(--text-muted))]">готово</span></div><div className="rounded-[14px] bg-[rgb(var(--surface-tint))] p-3"><span className="block text-lg">2</span><span className="text-[rgb(var(--text-muted))]">проверка</span></div><div className="rounded-[14px] bg-[rgb(var(--surface-muted))] p-3"><span className="block text-lg">0</span><span className="text-[rgb(var(--text-muted))]">отклонено</span></div></div>
      </Card>

      <Card className="mt-3.5" compact><h2 className="m-0 mb-2 text-xs font-black uppercase tracking-[0.12em] text-[rgb(var(--primary))]">Аккаунт</h2><SettingsRow href="/profile/personal" icon="profile" subtitle="Имя, телефон и контактные данные" title="Личная информация" /><SettingsRow href="/profile/language" icon="check" subtitle="Русский, узбекский и каракалпакский интерфейс" title="Язык" /></Card>

      <Card className="mt-3.5" compact><h2 className="m-0 mb-2 text-xs font-black uppercase tracking-[0.12em] text-[rgb(var(--primary))]">Поездки</h2><SettingsRow href="/reviews" icon="review" subtitle="Оценки завершённых поездок и водителей" title="Отзывы" /><SettingsRow href="/notifications" icon="bell" subtitle="Заявки, сообщения и поддержка" title="Уведомления" /></Card>

      <Card className="mt-3.5" compact><h2 className="m-0 mb-2 text-xs font-black uppercase tracking-[0.12em] text-[rgb(var(--primary))]">Посылки</h2><SettingsRow href="/parcels" icon="check" subtitle="История: доставлена, в пути и отменена" title="Мои посылки" /></Card>

      <Card className="mt-3.5" compact><h2 className="m-0 mb-2 text-xs font-black uppercase tracking-[0.12em] text-[rgb(var(--primary))]">Помощь и безопасность</h2><SettingsRow href="/safety" icon="shield" subtitle="Доступ к поездке, жалобы и экстренная помощь" title="Безопасность" /><SettingsRow href="/support" icon="help" subtitle="Открытые обращения и связь с поддержкой" title="Поддержка" /></Card>

      <Card className="mt-3.5" compact><h2 className="m-0 mb-2 text-xs font-black uppercase tracking-[0.12em] text-[rgb(var(--primary))]">Приложение</h2><SettingsRow href="/profile/settings" icon="star" subtitle="Приватность, версия приложения и документы" title="Настройки и о приложении" /></Card>
    </ClientShell>
  );
}
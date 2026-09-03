import type { ReactNode } from "react";
import { Avatar, Card, ClientHeader, ClientShell, SettingsRow, StatusPill } from "../client-ui";

function Group({ title, children }: { title: string; children: ReactNode }) {
  return <Card className="mt-4" compact><h2 className="m-0 mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-muted))]">{title}</h2>{children}</Card>;
}

export default function ProfilePage() {
  return (
    <ClientShell active="profile">
      <ClientHeader title="Профиль" subtitle="Аккаунт, поездки и помощь" />

      <section className="mt-6 flex items-center gap-4">
        <Avatar name="Пользователь ENVO" />
        <div className="min-w-0 flex-1">
          <h2 className="m-0 truncate text-xl font-semibold">Пользователь ENVO</h2>
          <p className="m-0 mt-1 text-sm text-[rgb(var(--text-muted))]">Телефон подтверждён · рейтинг 4.9</p>
        </div>
        <StatusPill tone="accent">7 билетов</StatusPill>
      </section>

      <Group title="Аккаунт">
        <SettingsRow href="/profile/personal" icon="profile" subtitle="Имя, телефон и контакты" title="Личные данные" />
      </Group>

      <Group title="Поездки">
        <SettingsRow href="/bookings" icon="car" subtitle="Активные, заявки и история" title="Мои поездки" />
        <SettingsRow href="/favorite-drivers" icon="star" subtitle="Водители, которым вы доверяете" title="Любимые водители" />
        <SettingsRow href="/search?from=Nukus&to=Urgench&saved=1" icon="check" subtitle="Nukus → Urgench и другие маршруты" title="Сохранённые маршруты" />
        <SettingsRow href="/search?from=Nukus&to=Urgench&repeat=last" icon="clock" subtitle="Повторить последний маршрут" title="Повторить поездку" />
        <SettingsRow href="/search?waitlist=1" icon="bell" subtitle="Сообщить, когда появится подходящий рейс" title="Лист ожидания" />
        <SettingsRow href="/profile/settings" icon="shield" subtitle="Водители, которых не предлагать" title="Не предлагать водителей" />
      </Group>

      <Group title="ENVO">
        <SettingsRow href="/rewards" icon="ticket" subtitle="Награды, розыгрыши и история" title="Награды" />
        <SettingsRow href="/rewards?tab=referrals" icon="profile" subtitle="Пригласить друзей и отслеживать статус" title="Рефералы" />
        <SettingsRow href="/rewards?tab=promo" icon="star" subtitle="Промокоды и партнёрские предложения" title="Промокоды" />
      </Group>

      <Group title="Активность">
        <SettingsRow href="/parcels" icon="check" subtitle="Создать или открыть историю доставок" title="Мои посылки" />
        <SettingsRow href="/reviews" icon="review" subtitle="Оценки завершённых поездок" title="Отзывы" />
      </Group>

      <Group title="Помощь">
        <SettingsRow href="/messages/support-envo" icon="help" subtitle="Чат поддержки с вложениями" title="Поддержка" />
        <SettingsRow href="/safety" icon="shield" subtitle="Поделиться поездкой и открыть помощь" title="Безопасность" />
      </Group>

      <Group title="Настройки">
        <SettingsRow href="/profile/language" icon="check" subtitle="Русский, узбекский, каракалпакский" title="Язык" />
        <SettingsRow href="/notifications" icon="bell" subtitle="Поездки, сообщения и поддержка" title="Уведомления" />
        <SettingsRow href="/profile/settings" icon="star" subtitle="Приватность и документы" title="О приложении" />
      </Group>
    </ClientShell>
  );
}
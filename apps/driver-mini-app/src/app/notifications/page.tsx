import { DriverCard, DriverHeader, DriverPill, DriverShell } from "../driver-ui";

const notifications = [
  ["Новая заявка на место", "Клиент ENVO запросил переднее пассажирское место на Nukus → Urgench.", "2 мин", "Новое"],
  ["Напоминание о поездке", "Выезд завтра в 08:30. Проверьте ожидающие заявки.", "1 ч", "Прочитано"],
  ["Подписка водителя", "Бесплатный период активен. Осталось 72 дня.", "Сегодня", "Прочитано"],
  ["Ответ поддержки", "Поддержка обновила обращение по вашей поездке.", "Вчера", "Прочитано"],
];

export default function DriverNotificationsPage() {
  return (
    <DriverShell active="profile">
      <DriverHeader
        title="Уведомления"
        subtitle="Заявки, поездки и поддержка"
        status={<DriverPill tone="warning">1 новое</DriverPill>}
      />

      <section aria-label="Уведомления водителя" className="mt-4 space-y-2.5">
        {notifications.map(([title, body, time, status]) => (
          <DriverCard
            key={title}
            className={status === "Новое" ? "ring-1 ring-[rgb(var(--primary)/0.22)]" : ""}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="m-0 text-base font-black">{title}</h1>
                <p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">{body}</p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xs font-black text-[rgb(var(--primary))]">{time}</div>
                <DriverPill tone={status === "Новое" ? "warning" : "neutral"}>{status}</DriverPill>
              </div>
            </div>
          </DriverCard>
        ))}
      </section>
    </DriverShell>
  );
}

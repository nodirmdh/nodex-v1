import Link from "next/link";
import { Card, ClientHeader, ClientShell, StatusPill } from "../client-ui";

const categories = [
  { label: "Проблема с поездкой", href: "/messages/support-ticket?topic=trip" },
  { label: "Проблема с водителем", href: "/messages/support-ticket?topic=driver" },
  { label: "Водитель опаздывает", href: "/messages/support-ticket?topic=driver-late" },
  { label: "Водитель не приехал", href: "/messages/support-ticket?topic=driver-no-show" },
  { label: "Потерянная вещь", href: "/messages/support-ticket?topic=lost-item" },
  { label: "Проблема с пассажиром", href: "/messages/support-ticket?topic=passenger" },
  { label: "Проблема с оплатой", href: "/messages/support-ticket?topic=payment" },
  { label: "Проблема с посылкой", href: "/parcels" },
  { label: "Безопасность", href: "/safety/sos" },
  { label: "Другое", href: "/messages/support-ticket?topic=other" },
];

export default function ClientSupportPage() {
  return (
    <ClientShell active="profile">
      <ClientHeader
        backHref="/profile"
        level="secondary"
        title="Поддержка"
        subtitle="Обращения и темы помощи"
      />

      <Card className="mt-4 space-y-2.5" compact>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-black">Открытое обращение</h2>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Координация посадки Nukus → Urgench.
            </p>
          </div>
          <StatusPill tone="info">В работе</StatusPill>
        </div>
        <div className="rounded-[18px] bg-[rgb(var(--canvas))] p-2.5 text-sm font-semibold text-[rgb(var(--text-muted))]">
          Поддержка добавила вашу заметку о посадке к заявке. Чат с водителем остаётся доступен.
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline"
          href="/messages/support-ticket"
        >
          Связаться с поддержкой
        </Link>
      </Card>

      <Card className="mt-3" compact>
        <h2 className="m-0 mb-3 text-lg font-black">С чем нужна помощь?</h2>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((category) => (
            <Link
              key={category.label}
              className="inline-flex min-h-11 items-center justify-center rounded-[18px] bg-[rgb(var(--surface-tint))] px-3 text-center text-sm font-black text-[rgb(var(--primary))] no-underline"
              href={category.href}
            >
              {category.label}
            </Link>
          ))}
        </div>
      </Card>

      <Card className="mt-3" compact>
        <h2 className="m-0 mb-3 text-lg font-black">Последняя активность поддержки</h2>
        <div className="grid gap-2.5">
          {[
            ["Обращение открыто", "Сегодня 08:10"],
            ["Поддержка начала проверку", "Сегодня 08:14"],
            ["Заметка для водителя добавлена", "Сегодня 08:18"],
          ].map(([title, time], index) => (
            <div key={title} className="grid grid-cols-[18px_1fr] gap-3">
              <span
                className={
                  index === 0
                    ? "mt-1 h-3 w-3 rounded-full bg-[rgb(var(--primary))]"
                    : "mt-1 h-3 w-3 rounded-full bg-[rgb(var(--border-strong))]"
                }
              />
              <div>
                <div className="text-sm font-black">{title}</div>
                <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">{time}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </ClientShell>
  );
}

import Link from "next/link";
import { Card, ClientHeader, ClientShell, Icon, StatusPill } from "../client-ui";

const safetyActions = [
  {
    title: "Пожаловаться на водителя или поездку",
    subtitle: "Отправить приватное обращение по безопасности",
    tone: "warning" as const,
    href: "/messages/support-envo?safety=report",
  },
  {
    title: "Связаться с поддержкой",
    subtitle: "Получить помощь по маршруту или посадке",
    tone: "info" as const,
    href: "/messages/support-envo?safety=support",
  },
  {
    title: "Доверенный контакт",
    subtitle: "Держите одного человека в курсе вашей поездки",
    tone: "success" as const,
    href: "/safety?trusted=contact",
  },
];

export default function ClientSafetyPage() {
  return (
    <ClientShell active="profile">
      <ClientHeader
        backHref="/profile"
        level="secondary"
        title="Безопасность"
        subtitle="Надёжная помощь в каждой поездке"
      />

      <Card className="mt-4 space-y-3" compact>
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]">
            <Icon name="shield" className="h-6 w-6" />
          </span>
          <div>
            <h2 className="m-0 text-lg font-black">Защита текущей поездки</h2>
            <p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Поделитесь деталями поездки, свяжитесь с поддержкой или откройте экстренную помощь при необходимости.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-center text-sm font-black text-[rgb(var(--primary-foreground))] no-underline"
            href="/trip-demo?share=1"
          >
            Поделиться поездкой
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--destructive-soft))] px-4 text-sm font-black text-[rgb(var(--destructive))] no-underline"
            href="/safety/sos"
          >
            SOS
          </Link>
        </div>
      </Card>

      <Card className="mt-3" compact>
        <h2 className="m-0 mb-3 text-lg font-black">Действия безопасности</h2>
        <div className="grid gap-2">
          {safetyActions.map((item) => (
            <Link
              key={item.title}
              className="flex items-center justify-between gap-3 rounded-[22px] bg-[rgb(var(--canvas))] p-3 text-[rgb(var(--foreground))] no-underline"
              href={item.href}
            >
              <div>
                <div className="text-sm font-black">{item.title}</div>
                <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">{item.subtitle}</div>
              </div>
              <StatusPill tone={item.tone}>{item.tone === "success" ? "Активные" : "Открыть"}</StatusPill>
            </Link>
          ))}
        </div>
      </Card>

      <Card className="mt-3" compact>
        <h2 className="m-0 text-lg font-black">Советы по безопасности</h2>
        <ul className="m-0 mt-3 grid gap-2 p-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
          <li className="list-none rounded-[16px] bg-[rgb(var(--canvas))] p-2.5">Проверьте номер автомобиля перед посадкой.</li>
          <li className="list-none rounded-[16px] bg-[rgb(var(--canvas))] p-2.5">По возможности ведите чат поездки внутри ENVO.</li>
          <li className="list-none rounded-[16px] bg-[rgb(var(--canvas))] p-2.5">Используйте SOS только в срочных ситуациях безопасности.</li>
        </ul>
      </Card>
    </ClientShell>
  );
}

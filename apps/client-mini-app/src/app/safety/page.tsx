import Link from "next/link";
import { Card, ClientHeader, ClientShell, Icon, StatusPill } from "../client-ui";

export default function ClientSafetyPage() {
  return (
    <ClientShell active="profile">
      <ClientHeader
        backHref="/profile"
        level="secondary"
        title="Safety"
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
              Поделитесь деталями поездки, свяжитесь с поддержкой или откройте экстренную помощь при
              необходимости.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="min-h-11 rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))]"
            type="button"
          >
            Поделиться поездкой
          </button>
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
          {(
            [
              [
                "Пожаловаться на водителя или поездку",
                "Отправить приватное обращение по безопасности",
                "warning" as const,
              ],
              [
                "Связаться с поддержкой",
                "Получить помощь по маршруту или посадке",
                "info" as const,
              ],
              [
                "Доверенный контакт",
                "Держите одного человека в курсе вашей поездки",
                "success" as const,
              ],
            ] as const
          ).map(([title, subtitle, tone]) => (
            <div
              key={title}
              className="flex items-center justify-between gap-3 rounded-[22px] bg-[rgb(var(--canvas))] p-3"
            >
              <div>
                <div className="text-sm font-black">{title}</div>
                <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">
                  {subtitle}
                </div>
              </div>
              <StatusPill tone={tone}>{tone === "success" ? "Активные" : "Открыть"}</StatusPill>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-3" compact>
        <h2 className="m-0 text-lg font-black">Советы по безопасности</h2>
        <ul className="m-0 mt-3 grid gap-2 p-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
          <li className="list-none rounded-[16px] bg-[rgb(var(--canvas))] p-2.5">
            Проверьте номер автомобиля перед посадкой.
          </li>
          <li className="list-none rounded-[16px] bg-[rgb(var(--canvas))] p-2.5">
            По возможности ведите чат поездки внутри Nodex.
          </li>
          <li className="list-none rounded-[16px] bg-[rgb(var(--canvas))] p-2.5">
            Используйте SOS только в срочных ситуациях безопасности.
          </li>
        </ul>
      </Card>
    </ClientShell>
  );
}

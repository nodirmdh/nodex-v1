import Link from "next/link";
import { Card, ClientHeader, ClientShell, Icon, StatusPill } from "../client-ui";

export default function ClientПлатежиPage() {
  return (
    <ClientShell active="profile">
      <ClientHeader backHref="/profile" title="Платежи" subtitle="Справочная страница по оплате" />

      <Card className="mt-5 space-y-4" label="Справка по оплате клиента">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]">
            <Icon name="ticket" />
          </span>
          <div>
            <StatusPill tone="accent">Не участвует в заявке на поездку</StatusPill>
            <h1 className="m-0 mt-3 text-xl font-black">Оплата поездки проходит вне ENVO</h1>
            <p className="m-0 mt-2 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Клиент отправляет заявку на место. Цена поездки носит справочный характер, оплата согласуется напрямую с водителем.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline"
            href="/bookings"
          >
            Открыть поездки
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--canvas))] px-4 text-sm font-black text-[rgb(var(--primary))] no-underline"
            href="/support"
          >
            Связаться с поддержкой
          </Link>
        </div>
      </Card>
    </ClientShell>
  );
}

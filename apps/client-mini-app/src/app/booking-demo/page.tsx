import Link from "next/link";
import { Card, ClientHeader, ClientShell, Icon, StatusPill } from "../client-ui";

export default function BookingDemoPage() {
  return (
    <ClientShell active="trips">
      <ClientHeader
        title="Превью заявки на место"
        subtitle="Внутренний маршрут сохранён для совместимости"
      />
      <Card className="mt-5 space-y-4">
        <StatusPill tone="accent">Внутренний preview</StatusPill>
        <h1 className="m-0 text-2xl font-black">Используйте настоящий выбор салона</h1>
        <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
          Старая demo-страница заменена потоком заявки на место в поездке.
        </p>
        <Link
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline"
          href="/trips/phase5-nukus-urgench-morning/book"
        >
          <Icon name="car" />
          Открыть выбор салона
        </Link>
      </Card>
    </ClientShell>
  );
}

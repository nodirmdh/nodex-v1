import Link from "next/link";
import { AppHeader, Badge, BottomNav, Button, Panel } from "@nodex/ui";

export default function DriverSosPage() {
  return (
    <main className="nodex-app mobile-shell pb-20">
      <AppHeader title="SOS" subtitle="Экстренные действия во время поездки" />
      <div className="space-y-4 px-4">
        <Panel className="space-y-3">
          <Badge tone="warning">Ручное подтверждение</Badge>
          <h1 className="m-0 text-lg font-black">Экстренные действия водителя</h1>
          <p className="m-0 text-sm text-slate-600">
            Demo-flow сохраняет контекст поездки и открывает поддержку. Экстренные службы автоматически не вызываются.
          </p>
          <div className="grid gap-2">
            <Button className="min-h-11">Позвонить в экстренную службу</Button>
            <Link className="flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline" href="/messages/support">
              Написать в поддержку ENVO
            </Link>
            <Link className="flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--surface))] px-4 text-sm font-black text-[rgb(var(--primary))] no-underline" href="/trip-demo">
              Открыть данные поездки
            </Link>
          </div>
        </Panel>
      </div>
      <BottomNav
        items={[
          { label: "Поездки" },
          { label: "Безопасность", active: true },
          { label: "Поддержка" },
          { label: "Профиль" },
        ]}
      />
    </main>
  );
}

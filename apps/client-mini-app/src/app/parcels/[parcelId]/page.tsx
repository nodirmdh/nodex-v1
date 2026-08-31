import { AppHeader, Badge, BottomNav, Button, Panel, Timeline, formatUzs } from "@nodex/ui";

export default async function ParcelDetailPage({
  params,
}: {
  params: Promise<{ parcelId: string }>;
}) {
  const { parcelId } = await params;

  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="Детали посылки" subtitle={parcelId} />
      <div className="space-y-4 px-4">
        <Panel className="space-y-3" aria-label="Детали отслеживания посылки">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="m-0 text-lg font-black">Конверт с документами</h1>
              <p className="m-0 text-sm text-slate-500">
                Nukus Central Station → Urgench Bus Station
              </p>
            </div>
            <Badge tone="info">READY_FOR_PICKUP</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
              <span className="block text-slate-500">Цена</span>
              <strong>{formatUzs(3000000)}</strong>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
              <span className="block text-slate-500">Код</span>
              <strong>Доступен отправителю</strong>
            </div>
          </div>
        </Panel>

        <Panel className="space-y-3" aria-label="Код получения посылки">
          <h2 className="m-0 text-base font-bold">Проверка получения</h2>
          <div className="rounded-[var(--radius-md)] border border-dashed border-[rgb(var(--border))] p-4 text-center text-2xl font-black tracking-[0.2em]">
            482913
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button">Сгенерировать заново</Button>
            <Button type="button" variant="secondary">
              Отменить посылку
            </Button>
          </div>
        </Panel>

        <Panel aria-label="История посылки">
          <Timeline
            items={[
              { label: "Создано отправителем", time: "09:00 UTC", active: true },
              { label: "Принято водителем", time: "09:06 UTC", active: true },
              { label: "Передано водителю", time: "09:20 UTC", active: true },
              { label: "Готово к выдаче", time: "12:10 UTC", active: true },
              { label: "Доставлено", time: "После кода получения" },
            ]}
          />
        </Panel>
      </div>
      <BottomNav
        items={[
          { label: "Главная" },
          { label: "Поиск" },
          { label: "Посылки", active: true },
          { label: "Профиль" },
        ]}
      />
    </main>
  );
}

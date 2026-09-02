import Link from "next/link";
import { AppHeader, Badge, BottomNav, Button, Panel, Timeline, formatUzs } from "@nodex/ui";

const statuses = [
  ["CREATED", "Создана"],
  ["DRIVER_ASSIGNED", "Водитель назначен"],
  ["ACCEPTED_BY_DRIVER", "Принята водителем"],
  ["PICKED_UP", "Забрана"],
  ["IN_TRANSIT", "В пути"],
  ["ARRIVING", "Прибывает"],
  ["DELIVERED", "Доставлена"],
] as const;

export default async function ParcelDetailPage({ params }: { params: Promise<{ parcelId: string }> }) {
  const { parcelId } = await params;
  const current = parcelId.includes("delivered") ? "DELIVERED" : parcelId.includes("cancelled") ? "CREATED" : "IN_TRANSIT";
  const currentIndex = statuses.findIndex(([key]) => key === current);

  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="Статус посылки" subtitle={parcelId} />
      <div className="space-y-4 px-4 pb-24">
        <Panel className="space-y-3" aria-label="Детали посылки">
          <div className="flex items-start justify-between gap-3"><div><h1 className="m-0 text-lg font-black">Конверт с документами</h1><p className="m-0 text-sm text-slate-500">Nukus, вокзал → Urgench, автостанция</p></div><Badge tone={current === "DELIVERED" ? "success" : "info"}>{statuses[currentIndex]?.[1] ?? "В пути"}</Badge></div>
          <div className="grid grid-cols-2 gap-2 text-sm"><Info label="Водитель" value="Madina Yusupova" /><Info label="Машина" value="Chevrolet Tracker" /><Info label="Получатель" value="Bekzod Ergashev" /><Info label="ETA" value="19:45 demo" /><Info label="Размер" value="Маленькая · документы" /><Info label="Demo price" value={formatUzs(3200000)} /></div>
          <p className="m-0 rounded-[18px] bg-[rgb(var(--surface-muted))] p-3 text-sm text-slate-600">Номер телефона получателя не показывается. Связь идёт через ENVO чат и поддержку.</p>
          <div className="grid grid-cols-3 gap-2"><Link className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[rgb(var(--primary))] px-3 text-xs font-bold text-[rgb(var(--primary-foreground))] no-underline" href="/messages/parcel-driver">ENVO чат</Link><Link className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] px-3 text-xs font-bold text-[rgb(var(--primary))] no-underline" href="/support?parcel=phase8-parcel-ready">Поддержка</Link><Button type="button" variant="secondary">Поделиться</Button></div>
        </Panel>

        <Panel aria-label="История статусов посылки"><Timeline items={statuses.map(([key, label], index) => ({ label, time: index <= currentIndex ? "готово" : "ожидает", active: index <= currentIndex }))} /></Panel>

        <Panel className="space-y-3" aria-label="Код получения"><h2 className="m-0 text-base font-bold">Код получения</h2><div className="rounded-[var(--radius-md)] border border-dashed border-[rgb(var(--border))] p-4 text-center text-2xl font-black tracking-[0.2em]">482913</div><p className="m-0 text-sm text-slate-500">Код нужен только при передаче получателю.</p></Panel>
      </div>
      <BottomNav items={[{ label: "Главная" }, { label: "Поиск" }, { label: "Посылки", active: true }, { label: "Профиль" }]} />
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[16px] bg-[rgb(var(--surface-muted))] p-3"><span className="block text-xs text-slate-500">{label}</span><strong>{value}</strong></div>;
}
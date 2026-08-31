import Link from "next/link";
import { AppHeader, Badge, BottomNav, Button, Panel, Timeline, formatUzs } from "@nodex/ui";

const parcels = [
  {
    id: "phase8-parcel-ready",
    route: "Nukus → Urgench",
    title: "Конверт с документами",
    status: "READY_FOR_PICKUP",
    category: "Документы",
    priceMinor: 3000000,
  },
  {
    id: "phase8-parcel-accepted",
    route: "Nukus → Khiva",
    title: "Мелкая электроника",
    status: "ACCEPTED",
    category: "Электроника",
    priceMinor: 3500000,
  },
];

function tone(status: string) {
  if (status === "DELIVERED") return "success";
  if (status === "READY_FOR_PICKUP" || status === "IN_TRANSIT") return "info";
  if (status.startsWith("CANCELLED") || status === "REJECTED") return "danger";
  return "warning";
}

export default function ClientПосылкиPage() {
  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="Посылки" subtitle="Создание, отслеживание и коды передачи" />
      <div className="space-y-4 px-4">
        <Panel className="space-y-3" aria-label="Форма создания посылки">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="m-0 text-lg font-black">Отправить посылку</h1>
              <p className="m-0 text-sm text-slate-500">
                Доставка по маршруту с проверенными водителями.
              </p>
            </div>
            <Badge tone="info">UZS</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label className="grid gap-1">
              <span className="font-medium">Категория</span>
              <select className="min-h-11 rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-white px-3">
                <option>Документы</option>
                <option>Одежда</option>
                <option>Электроника</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span className="font-medium">Вес</span>
              <input
                className="min-h-11 rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-white px-3"
                defaultValue="1.2 kg"
              />
            </label>
          </div>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Телефон получателя</span>
            <input
              className="min-h-11 rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-white px-3"
              defaultValue="+998 90 123 45 67"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button">Создать посылку</Button>
            <Button type="button" variant="secondary">
              Добавить фото
            </Button>
          </div>
        </Panel>

        <section aria-label="Мои посылки" className="space-y-3">
          {parcels.map((parcel) => (
            <Panel key={parcel.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="m-0 text-base font-bold">{parcel.title}</h2>
                  <p className="m-0 text-sm text-slate-500">
                    {parcel.route} - {parcel.category}
                  </p>
                </div>
                <Badge tone={tone(parcel.status)}>{parcel.status}</Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <strong>{formatUzs(parcel.priceMinor)}</strong>
                <Link
                  className="text-sm font-semibold text-[rgb(var(--primary))]"
                  href={`/parcels/${parcel.id}`}
                >
                  Отследить
                </Link>
              </div>
            </Panel>
          ))}
        </section>

        <Panel aria-label="Превью истории посылки">
          <Timeline
            items={[
              { label: "Посылка создана", time: "09:00", active: true },
              { label: "Водитель принял", time: "09:06", active: true },
              { label: "Готово к выдаче", time: "После прибытия" },
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

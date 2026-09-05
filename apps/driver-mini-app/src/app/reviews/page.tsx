import { DriverCard, DriverHeader, DriverPill, DriverShell } from "../driver-ui";

const reviews = [
  ["Клиент ENVO", "5.0", "Nukus → Urgench · 12 авг", "Пунктуальный водитель и понятная коммуникация."],
  ["Отправитель посылки", "5.0", "Nukus → Khiva · 9 авг", "Аккуратная передача посылки."],
];

export default function DriverReviewsPage() {
  return (
    <DriverShell active="profile">
      <DriverHeader title="Отзывы" subtitle="Репутация по завершённым поездкам" status={<DriverPill tone="success">4.9</DriverPill>} />

      <DriverCard className="mt-4 space-y-3" label="Сводка отзывов водителя">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="m-0 text-xl font-black">Профиль надёжности</h1>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">Отзывы пассажиров и отправителей после завершённых поездок.</p>
          </div>
          <DriverPill tone="success">Надёжный</DriverPill>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Metric label="Рейтинг" value="4.9" />
          <Metric label="Отзывы" value="128" />
          <Metric label="Поездки" value="268" />
        </div>
        <button className="min-h-11 w-full rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))]" type="button">Посмотреть полученные отзывы</button>
      </DriverCard>

      <section aria-label="Отзывы водителя" className="mt-3 space-y-3">
        {reviews.map(([name, rating, route, comment]) => (
          <DriverCard key={name} className="space-y-2">
            <div className="flex items-start justify-between gap-3"><div><h2 className="m-0 text-base font-black">{name}</h2><p className="m-0 text-xs font-semibold text-[rgb(var(--text-muted))]">{route}</p></div><DriverPill tone="accent">{rating}</DriverPill></div>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">“{comment}”</p>
          </DriverCard>
        ))}
      </section>
    </DriverShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3"><div className="text-lg font-black">{value}</div><div className="text-[10px] font-bold text-[rgb(var(--text-muted))]">{label}</div></div>;
}

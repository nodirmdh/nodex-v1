import Link from "next/link";
import { ArrowUpRight, Headphones, Route, ShieldAlert, ShieldCheck, Ticket } from "lucide-react";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "../admin-shell";
import { Status } from "../admin-components";

const primaryQueues = [
  { label: "Поездки в работе", value: "18", detail: "Посадка, активные рейсы и ETA", href: "/trips", icon: <Route size={18} />, tone: "success" as const },
  { label: "Бронирования", value: "143", detail: "Места, багаж, весь автомобиль", href: "/bookings", icon: <Ticket size={18} />, tone: "info" as const },
  { label: "Поддержка", value: "9", detail: "Открытые диалоги операторов", href: "/support", icon: <Headphones size={18} />, tone: "warning" as const },
  { label: "Protection", value: "5", detail: "Отмены, задержки и замены", href: "/reliability", icon: <ShieldCheck size={18} />, tone: "danger" as const },
];

const worklist = [
  ["Поддержка", "sup_9002", "Координация посадки требует ответа", "/support/sup_9002", "Open"],
  ["Матчинг", "wait_6101", "Лист ожидания Nukus → Urgench найден к поездке", "/matching", "Matched"],
  ["Награды", "rew_3003", "Бонус удержан до антифрод-проверки", "/rewards", "Pending"],
  ["Поездка", "trip_7001", "Посадка началась, проверка PIN", "/trips/trip_7001", "Boarding"],
] as const;

const signals = [
  ["Надёжность", "80%", "успешных замен", "/reliability"],
  ["Антифрод", "3", "дела с высоким риском", "/fraud"],
  ["Награды", "18", "операций на проверке", "/rewards"],
  ["Промо", "2", "активные кампании", "/promotions"],
] as const;

export default function DashboardPage() {
  return (
    <main className="admin-main">
      <AdminPageHeader title="Панель управления" subtitle="Короткий обзор очередей ENVO: что требует внимания сейчас и куда перейти дальше." />
      <section className="grid gap-3 xl:grid-cols-4 md:grid-cols-2">
        {primaryQueues.map((item) => (
          <Link className="text-[rgb(var(--foreground))] no-underline" href={item.href} key={item.label}>
            <AdminPanel className="h-full p-4 transition hover:border-[rgb(var(--primary))] hover:bg-[rgb(var(--surface-muted))]">
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-[rgb(var(--surface-muted))] text-[rgb(var(--primary))]">{item.icon}</span>
                <AdminStatusBadge tone={item.tone}>{item.value}</AdminStatusBadge>
              </div>
              <div className="mt-4 text-base font-black">{item.label}</div>
              <p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">{item.detail}</p>
            </AdminPanel>
          </Link>
        ))}
      </section>
      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <AdminPanel className="overflow-hidden" label="Рабочая очередь">
          <div className="border-b border-[rgb(var(--border))] px-4 py-3">
            <h2 className="m-0 text-base font-black">Рабочая очередь</h2>
            <p className="m-0 mt-1 text-xs font-semibold text-[rgb(var(--text-muted))]">Кликабельные события без лишних карточек.</p>
          </div>
          <div className="divide-y divide-[rgb(var(--border))]">
            {worklist.map(([section, id, label, href, status]) => (
              <Link className="grid grid-cols-[120px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-[rgb(var(--foreground))] no-underline hover:bg-[rgb(var(--surface-muted))]" href={href} key={id}>
                <span className="text-xs font-bold uppercase tracking-[0.06em] text-[rgb(var(--text-muted))]">{section}</span>
                <span className="min-w-0"><span className="block truncate font-black">{label}</span><span className="text-sm text-[rgb(var(--text-muted))]">{id}</span></span>
                <Status value={status} />
              </Link>
            ))}
          </div>
        </AdminPanel>
        <AdminPanel className="p-4" label="Контрольные сигналы">
          <div className="flex items-center justify-between gap-3">
            <h2 className="m-0 text-base font-black">Сигналы</h2>
            <ShieldAlert size={18} className="text-[rgb(var(--warning))]" />
          </div>
          <div className="mt-3 grid gap-2">
            {signals.map(([label, value, detail, href]) => (
              <Link className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-[8px] bg-[rgb(var(--canvas))] p-3 text-[rgb(var(--foreground))] no-underline hover:bg-[rgb(var(--surface-muted))]" href={href} key={label}>
                <span><span className="block text-sm font-black">{label}</span><span className="text-xs font-semibold text-[rgb(var(--text-muted))]">{detail}</span></span>
                <span className="inline-flex items-center gap-1 text-sm font-black text-[rgb(var(--primary))]">{value}<ArrowUpRight size={14} /></span>
              </Link>
            ))}
          </div>
        </AdminPanel>
      </section>
    </main>
  );
}

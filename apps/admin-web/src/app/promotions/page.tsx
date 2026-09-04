"use client";

import { useMemo, useState } from "react";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "../admin-shell";
import { Breadcrumbs, QuickActionModal, Status, Toolbar } from "../admin-components";

const seedPromotions = [
  { id: "PROMO-101", partner: "Karakalpak Travel", title: "Бонус за маршрут Urgench", status: "Enabled", schedule: "10 июн → 18 июн", cta: "Получить билет", impressions: 18420, clicks: 934, conversions: 82 },
  { id: "PROMO-102", partner: "Cafe Aral", title: "Кофе после поездки", status: "Scheduled", schedule: "19 июн → 30 июн", cta: "Открыть предложение", impressions: 8200, clicks: 288, conversions: 31 },
  { id: "PROMO-103", partner: "Hotel Nukus", title: "Отель после поездки", status: "Disabled", schedule: "Пауза", cta: "Открыть партнёра", impressions: 4210, clicks: 96, conversions: 9 },
];

type Promo = (typeof seedPromotions)[number];

export default function PromotionsPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const [promotions, setPromotions] = useState(seedPromotions);
  const [editing, setEditing] = useState<Promo | null>(null);
  const rows = useMemo(() => promotions.filter((promo) => `${promo.id} ${promo.partner} ${promo.title} ${promo.status}`.toLowerCase().includes(query.toLowerCase()) && (filter === "All statuses" || promo.status === filter)), [filter, promotions, query]);

  function toggle(id: string) {
    setPromotions((items) => items.map((item) => item.id === id ? { ...item, status: item.status === "Enabled" ? "Disabled" : "Enabled" } : item));
  }

  return <main className="admin-main"><Breadcrumbs items={[{ label: "Админ", href: "/dashboard" }, { label: "Промо" }]} /><AdminPageHeader title="Промо" subtitle="Партнёрские баннеры, расписание и preview-сигналы конверсии." actions={<QuickActionModal label="Создать промо" title="Новое промо" action="Сохранить demo"><PromotionForm /></QuickActionModal>} />
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <AdminPanel className="overflow-hidden"><Toolbar query={query} onQuery={setQuery} filters={["All statuses", "Enabled", "Scheduled", "Disabled"]} activeFilter={filter} onFilter={setFilter} placeholder="Промо, партнёр, кнопка" count={rows.length} /><div className="grid gap-3 p-4">{rows.map((promo) => <section key={promo.id} className="grid gap-3 rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] p-4 lg:grid-cols-[1fr_auto]"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong>{promo.title}</strong><Status value={promo.status} /><AdminStatusBadge tone="info">{promo.partner}</AdminStatusBadge></div><p className="m-0 mt-2 text-sm font-semibold text-[rgb(var(--text-muted))]">{promo.id} · {promo.schedule} · Кнопка: {promo.cta}</p><div className="mt-3 grid grid-cols-3 gap-2 text-sm"><Metric label="Показы" value={String(promo.impressions)} /><Metric label="Клики" value={String(promo.clicks)} /><Metric label="Конверсии" value={String(promo.conversions)} /></div></div><div className="flex flex-wrap items-start gap-2"><button className="min-h-9 rounded-[10px] border border-[rgb(var(--border))] px-3 text-sm font-black" type="button" onClick={() => setEditing(promo)}>Изменить</button><button className="min-h-9 rounded-[10px] bg-[rgb(var(--primary))] px-3 text-sm font-black text-[rgb(var(--primary-foreground))]" type="button" onClick={() => toggle(promo.id)}>{promo.status === "Enabled" ? "Выключить" : "Включить"}</button></div></section>)}</div></AdminPanel>
      <AdminPanel className="p-4"><h2 className="m-0 text-lg font-black">Предпросмотр баннера</h2><div className="mt-3 rounded-[8px] bg-[linear-gradient(135deg,rgb(var(--primary)),rgb(var(--foreground)))] p-4 text-white"><div className="text-xs font-black uppercase opacity-75">Партнёр</div><div className="mt-1 text-xl font-black">Бонус за маршрут Urgench</div><p className="text-sm font-semibold opacity-85">Дополнительный билет за подтверждённые поездки до 18 июня.</p><button className="min-h-9 rounded-[10px] bg-white px-3 text-sm font-black text-[rgb(var(--primary))]" type="button">Получить билет</button></div><p className="text-sm font-semibold text-[rgb(var(--text-muted))]">Изображение, срок, CTA и партнёр редактируются в demo-модалках.</p></AdminPanel>
    </div>
    {editing ? <EditModal promo={editing} onClose={() => setEditing(null)} onSave={(next) => { setPromotions((items) => items.map((item) => item.id === next.id ? next : item)); setEditing(null); }} /> : null}
  </main>;
}

function PromotionForm() { return <div className="grid gap-2"><input className="min-h-10 rounded-[10px] border border-[rgb(var(--border))] px-3" defaultValue="Партнёр" /><input className="min-h-10 rounded-[10px] border border-[rgb(var(--border))] px-3" defaultValue="Название кампании" /><textarea className="min-h-20 rounded-[10px] border border-[rgb(var(--border))] p-3" defaultValue="Описание, CTA, даты и placeholder изображения." /></div>; }
function EditModal({ promo, onClose, onSave }: { promo: Promo; onClose: () => void; onSave: (promo: Promo) => void }) { const [draft, setDraft] = useState(promo); return <div className="fixed inset-0 z-50 grid place-items-center bg-black/36 p-4" role="dialog" aria-modal="true"><section className="w-full max-w-[560px] rounded-[14px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-lg)]"><div className="flex items-start justify-between gap-3"><h2 className="m-0 text-xl font-black">Изменить промо</h2><button className="grid h-8 w-8 place-items-center rounded-[10px] border border-[rgb(var(--border))]" type="button" onClick={onClose}>x</button></div><div className="mt-3 grid gap-2"><input className="min-h-10 rounded-[10px] border border-[rgb(var(--border))] px-3" value={draft.partner} onChange={(e) => setDraft({ ...draft, partner: e.target.value })} /><input className="min-h-10 rounded-[10px] border border-[rgb(var(--border))] px-3" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /><input className="min-h-10 rounded-[10px] border border-[rgb(var(--border))] px-3" value={draft.schedule} onChange={(e) => setDraft({ ...draft, schedule: e.target.value })} /><input className="min-h-10 rounded-[10px] border border-[rgb(var(--border))] px-3" value={draft.cta} onChange={(e) => setDraft({ ...draft, cta: e.target.value })} /></div><div className="mt-4 flex justify-end gap-2"><button className="min-h-9 rounded-[10px] border border-[rgb(var(--border))] px-3 text-sm font-black" type="button" onClick={onClose}>Отмена</button><button className="min-h-9 rounded-[10px] bg-[rgb(var(--primary))] px-3 text-sm font-black text-[rgb(var(--primary-foreground))]" type="button" onClick={() => onSave(draft)}>Сохранить</button></div></section></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-[8px] bg-[rgb(var(--surface))] p-3"><div className="font-black">{value}</div><div className="text-xs font-semibold text-[rgb(var(--text-muted))]">{label}</div></div>; }

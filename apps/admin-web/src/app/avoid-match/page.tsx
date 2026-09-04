"use client";

import { useState } from "react";
import { Ban, Eye, RotateCcw, ShieldCheck } from "lucide-react";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "../admin-shell";

const initialRelations = [
  {
    id: "avoid-client-driver-1",
    direction: "Клиент → водитель",
    subject: "ENVO Client",
    target: "Azizbek Karimov · Chevrolet Cobalt · 95 A 214 QA",
    addedBy: "Клиент",
    date: "Сегодня, 14:20",
    reason: "опоздание",
    status: "Активно",
  },
  {
    id: "avoid-driver-client-1",
    direction: "Водитель → пассажир",
    subject: "Azizbek Driver",
    target: "M. Seitov · Nukus → Urgench",
    addedBy: "Водитель",
    date: "Сегодня, 09:05",
    reason: "не понравилась поездка",
    status: "Активно",
  },
  {
    id: "avoid-safety-1",
    direction: "Safety review",
    subject: "Support agent",
    target: "D. Allamuratov · no-show case",
    addedBy: "Админ",
    date: "12 авг, 18:30",
    reason: "грубое общение",
    status: "На проверке",
  },
];

export default function AvoidMatchPage() {
  const [relations, setRelations] = useState(initialRelations);
  const [inspected, setInspected] = useState(initialRelations[0]!);

  return (
    <main className="p-5">
      <AdminPageHeader
        title="Не предлагать"
        subtitle="Исключения подбора между клиентами и водителями."
        actions={<AdminStatusBadge tone="info">Просмотр</AdminStatusBadge>}
      />

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <AdminPanel className="overflow-hidden" label="Avoid-match relations">
          <div className="grid grid-cols-[1fr_1.2fr_0.9fr_0.7fr_0.8fr_auto] gap-3 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">
            <span>Связь</span>
            <span>Кого не предлагать</span>
            <span>Кто добавил</span>
            <span>Дата</span>
            <span>Причина</span>
            <span>Действия</span>
          </div>
          {relations.map((relation) => (
            <div key={relation.id} className="grid grid-cols-[1fr_1.2fr_0.9fr_0.7fr_0.8fr_auto] items-center gap-3 border-b border-[rgb(var(--border))] px-4 py-3 text-sm last:border-b-0">
              <div className="min-w-0">
                <div className="font-black">{relation.direction}</div>
                <div className="truncate text-xs font-semibold text-[rgb(var(--text-muted))]">{relation.subject}</div>
              </div>
              <div className="min-w-0 truncate font-semibold">{relation.target}</div>
              <div className="font-semibold text-[rgb(var(--text-muted))]">{relation.addedBy}</div>
              <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">{relation.date}</div>
              <div><AdminStatusBadge tone={relation.status === "Активно" ? "warning" : "info"}>{relation.reason}</AdminStatusBadge></div>
              <div className="flex gap-2">
                <button aria-label="Открыть проверку" className="grid h-9 w-9 place-items-center rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))]" onClick={() => setInspected(relation)} type="button"><Eye size={15} /></button>
                <button aria-label="Убрать связь" className="grid h-9 w-9 place-items-center rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))]" onClick={() => setRelations((current) => current.filter((item) => item.id !== relation.id))} type="button"><RotateCcw size={15} /></button>
              </div>
            </div>
          ))}
        </AdminPanel>

        <AdminPanel className="p-4" label="Avoid-match inspection">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.1em] text-[rgb(var(--primary))]">Проверка связи</div>
              <h2 className="m-0 mt-1 text-xl font-black">{inspected.direction}</h2>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-[rgb(var(--warning-soft))] text-[rgb(var(--warning))]"><Ban size={18} /></span>
          </div>
          <div className="mt-4 grid gap-3 text-sm">
            <Info label="Инициатор" value={inspected.subject} />
            <Info label="Не предлагать" value={inspected.target} />
            <Info label="Кто добавил" value={inspected.addedBy} />
            <Info label="Дата" value={inspected.date} />
            <Info label="Причина" value={inspected.reason} />
          </div>
          <div className="mt-4 rounded-[12px] bg-[rgb(var(--success-soft))] p-3 text-sm font-semibold text-[rgb(var(--success))]">
            <ShieldCheck className="mr-2 inline" size={16} />
            Эта пара будет исключена из будущих рекомендаций. Изменения пока не сохраняются.
          </div>
        </AdminPanel>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-[rgb(var(--canvas))] p-3">
      <div className="text-xs font-black uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">{label}</div>
      <div className="mt-1 font-black">{value}</div>
    </div>
  );
}

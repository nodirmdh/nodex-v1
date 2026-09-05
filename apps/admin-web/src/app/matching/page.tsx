"use client";

import { useState } from "react";
import { AdminPageHeader, AdminPanel } from "../admin-shell";
import { QuickActionModal, Status } from "../admin-components";
import { trips, waitlists } from "../admin-data";

const tabs = ["Активные листы ожидания", "Подбор", "Найденные поездки", "ENVO Fill спрос", "ENVO Return активность", "Истекшие / отменённые"];

const demandLabels: Record<string, string> = {
  "2 seats": "2 места",
  "Whole car": "Вся машина",
  "1 seat": "1 место",
  Parcel: "Посылка",
};

const matchLabels: Record<string, string> = {
  Matched: "Вариант найден",
  None: "Пока нет варианта",
  "Pending driver": "Ожидает водителя",
};

export default function MatchingPage() {
  const [tab, setTab] = useState(tabs[0]);
  return <main className="admin-main"><AdminPageHeader title="Подбор" subtitle="Листы ожидания, найденные варианты, ENVO Fill и ENVO Return." /><AdminPanel className="overflow-hidden"><div className="flex gap-1 overflow-x-auto border-b border-[rgb(var(--border))] p-2">{tabs.map((item) => <button key={item} className={`min-h-9 rounded-[10px] px-3 text-sm font-black ${tab === item ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))]"}`} onClick={() => setTab(item)} type="button">{item}</button>)}</div><div className="overflow-x-auto"><table className="w-full min-w-[720px] table-fixed border-collapse text-sm"><thead className="sticky top-0 bg-[rgb(var(--canvas))]"><tr>{["Заявка", "Маршрут", "Статус", "Спрос", "Подбор", "Действие"].map((h) => <th className="border-b border-[rgb(var(--border))] px-4 py-3 text-left text-[11px] font-black uppercase text-[rgb(var(--text-muted))]" key={h}>{h}</th>)}</tr></thead><tbody>{waitlists.map((item) => <tr className="border-b border-[rgb(var(--border))] hover:bg-[rgb(var(--surface-muted))]" key={item.id}><td className="px-4 py-3 font-black">{item.id}</td><td className="truncate px-4 py-3">{item.route}</td><td className="truncate px-4 py-3"><Status value={item.status} /></td><td className="truncate px-4 py-3">{demandLabels[item.demand] ?? item.demand}</td><td className="truncate px-4 py-3">{matchLabels[item.match] ?? item.match}</td><td className="truncate px-4 py-3"><QuickActionModal label="Детали" title="Детали подбора"><p>{item.client} · {item.route}</p><p>Связанные поездки: {trips.map((trip) => trip.id).join(", ")}</p></QuickActionModal></td></tr>)}</tbody></table></div></AdminPanel></main>;
}
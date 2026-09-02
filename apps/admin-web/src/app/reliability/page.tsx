"use client";

import { useState } from "react";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "../admin-shell";
import { Breadcrumbs, QuickActionModal, Status } from "../admin-components";

type BadgeTone = "success" | "warning" | "danger" | "info";

const overview: Array<[string, string, BadgeTone]> = [
  ["Задержки", "6", "warning"],
  ["Отмены водителей", "3", "danger"],
  ["Поиск замены", "5", "info"],
  ["Успешная замена", "80%", "success"],
  ["Критичные случаи", "2", "danger"],
 ];

const protectionCases = [
  { id: "PROT-1042", trip: "Nukus → Urgench", original: "Azizbek Karimov", event: "Поздняя отмена", reason: "Машина недоступна", timing: "за 25 минут до выезда", search: "Замена найдена", replacement: "Madina Yusupova", resolution: "Клиент принял", delay: "08:30 по расписанию, 08:55 отмена, 09:02 замена" },
  { id: "PROT-1043", trip: "Nukus → Khiva", original: "Sherzod Rakhimov", event: "Критическая задержка", reason: "Пробки", timing: "задержка 35 минут", search: "Идёт поиск", replacement: "Ожидает", resolution: "Поддержка следит", delay: "08:50 +10, 09:05 +25, 09:14 критично" },
  { id: "PROT-1044", trip: "Urgench → Nukus", original: "Bekzod Driver", event: "Замена не найдена", reason: "Водитель отменил", timing: "за 18 минут до выезда", search: "Нет подходящего водителя", replacement: "Нет", resolution: "Клиент сменил время", delay: "17:40 отмена, 17:47 замена не найдена" },
];

const driverEvents = [
  ["Azizbek Karimov", "ENVO Pro", "98%", "1.2%", "94%", "Разбор поздней отмены"],
  ["Madina Yusupova", "Отличный", "96%", "2.1%", "91%", "Замена принята"],
  ["Sherzod Rakhimov", "Надёжный", "93%", "3.8%", "89%", "Сообщил о критической задержке"],
] as const;

export default function ReliabilityPage() {
  const [mode, setMode] = useState<"cases" | "drivers">("cases");
  return <main className="admin-main"><Breadcrumbs items={[{ label: "Админ", href: "/dashboard" }, { label: "Надёжность" }]} /><AdminPageHeader title="Надёжность / ENVO Protection" subtitle="Задержки, отмены, поиск замены и видимость надёжности водителей." />
    <section className="grid gap-3 xl:grid-cols-5 md:grid-cols-2">{overview.map(([label, value, tone]) => <AdminPanel key={label} className="p-4"><AdminStatusBadge tone={tone}>{label}</AdminStatusBadge><div className="mt-3 text-3xl font-black">{value}</div></AdminPanel>)}</section>
    <div className="mt-4 flex gap-2"><button className={`min-h-9 rounded-[10px] px-3 text-sm font-black ${mode === "cases" ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "border border-[rgb(var(--border))] bg-[rgb(var(--surface))]"}`} type="button" onClick={() => setMode("cases")}>Случаи Protection</button><button className={`min-h-9 rounded-[10px] px-3 text-sm font-black ${mode === "drivers" ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "border border-[rgb(var(--border))] bg-[rgb(var(--surface))]"}`} type="button" onClick={() => setMode("drivers")}>Надёжность водителей</button></div>
    {mode === "cases" ? <AdminPanel className="mt-3 overflow-hidden"><div className="grid min-w-[920px] grid-cols-[110px_1fr_1fr_1fr_1fr_1fr_auto] gap-3 border-b border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-4 py-3 text-xs font-black uppercase text-[rgb(var(--text-muted))]"><span>Случай</span><span>Поездка</span><span>Первый водитель</span><span>Отмена</span><span>Замена</span><span>Итог</span><span>Действие</span></div>{protectionCases.map((item) => <div key={item.id} className="grid min-w-[920px] grid-cols-[110px_1fr_1fr_1fr_1fr_1fr_auto] gap-3 border-b border-[rgb(var(--border))] px-4 py-3 text-sm"><strong>{item.id}</strong><span>{item.trip}</span><span>{item.original}</span><span>{item.reason} · {item.timing}</span><span>{item.search} · {item.replacement}</span><Status value={item.resolution} /><QuickActionModal label="Открыть" title="Случай Protection"><p>Первый водитель: {item.original}</p><p>Событие отмены: {item.event} · {item.reason} · {item.timing}</p><p>Поиск замены: {item.search}</p><p>Новый водитель: {item.replacement}</p><p>История задержки: {item.delay}</p></QuickActionModal></div>)}</AdminPanel> : null}
    {mode === "drivers" ? <AdminPanel className="mt-3 overflow-hidden"><div className="grid min-w-[760px] grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1.4fr] gap-3 border-b border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-4 py-3 text-xs font-black uppercase text-[rgb(var(--text-muted))]"><span>Водитель</span><span>Статус</span><span>Завершение</span><span>Отмены</span><span>Пунктуальность</span><span>Последнее событие</span></div>{driverEvents.map(([driver, status, completion, cancelRate, punctuality, event]) => <div key={driver} className="grid min-w-[760px] grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1.4fr] gap-3 border-b border-[rgb(var(--border))] px-4 py-3 text-sm"><strong>{driver}</strong><Status value={status} /><span>{completion}</span><span>{cancelRate}</span><span>{punctuality}</span><span>{event}</span></div>)}</AdminPanel> : null}
  </main>;
}

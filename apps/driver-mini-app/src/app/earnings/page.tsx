"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, formatUzs } from "@nodex/ui";
import { DriverCard, DriverHeader, DriverPill, DriverShell } from "../driver-ui";

type ModalKey = "progress" | "history" | "referral" | null;
const recent = ["Бонус за 5 поездок · одобрен", "Серия без отмен · активна", "Качество поездки · на проверке"];

export default function DriverEarningsPage() {
  const [modal, setModal] = useState<ModalKey>(null);
  return (
    <DriverShell active="profile">
      <DriverHeader title="Награды" subtitle="Прогресс и бонусы водителя" status={<DriverPill tone="accent">36/50</DriverPill>} />
      <section className="mt-6"><h1 className="m-0 text-[28px] font-semibold">До бонуса осталось 14 поездок</h1><p className="m-0 mt-2 text-sm text-[rgb(var(--text-muted))]">Считаются завершённые поездки без отмен и спорных событий.</p></section>
      <DriverCard className="mt-5"><div className="h-2 overflow-hidden rounded-full bg-[rgb(var(--canvas))]"><div className="h-full w-[72%] rounded-full bg-[rgb(var(--primary))]" /></div><div className="mt-3 grid grid-cols-3 gap-2 text-center"><Metric label="Поездки" value="36" /><Metric label="Серия" value="7 дней" /><Metric label="Бонус" value={formatUzs(20000000)} /></div></DriverCard>
      <DriverCard className="mt-4"><h2 className="m-0 text-lg font-semibold">Ближайший milestone</h2><p className="m-0 mt-2 text-sm text-[rgb(var(--text-muted))]">50 поездок с подтверждённой посадкой и без критических отмен.</p><Button className="mt-3 w-full" type="button" onClick={() => setModal("progress")}>Подробнее</Button></DriverCard>
      <DriverCard className="mt-4"><h2 className="m-0 text-lg font-semibold">Недавние награды</h2><div className="mt-3 grid gap-2">{recent.map((item) => <div key={item} className="rounded-[16px] bg-[rgb(var(--canvas))] p-3 text-sm text-[rgb(var(--text-muted))]">{item}</div>)}</div><div className="mt-3 grid grid-cols-2 gap-2"><button className="min-h-10 rounded-[16px] border-0 bg-[rgb(var(--canvas))] text-sm font-semibold" type="button" onClick={() => setModal("history")}>История</button><button className="min-h-10 rounded-[16px] border-0 bg-[rgb(var(--canvas))] text-sm font-semibold" type="button" onClick={() => setModal("referral")}>Рефералы</button></div></DriverCard>
      {modal ? <Modal title={modal === "progress" ? "Прогресс" : modal === "history" ? "История" : "Рефералы"} onClose={() => setModal(null)}>{modal === "referral" ? "Пригласите водителя: бонус после проверки документов и первой поездки." : "Демо-состояние показывает только локальный прогресс без выплат в приложении."}</Modal> : null}
    </DriverShell>
  );
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3"><div className="text-base font-semibold">{value}</div><div className="mt-1 text-xs text-[rgb(var(--text-muted))]">{label}</div></div>; }
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-50 grid place-items-end bg-[rgb(var(--foreground)/0.28)] p-3" role="dialog" aria-modal="true"><section className="w-full max-w-[430px] rounded-t-[28px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-floating)]"><div className="flex items-center justify-between"><h2 className="m-0 text-lg font-semibold">{title}</h2><button className="h-9 w-9 rounded-full border-0 bg-[rgb(var(--canvas))]" type="button" onClick={onClose}>×</button></div><p className="m-0 mt-3 text-sm leading-6 text-[rgb(var(--text-muted))]">{children}</p><Button className="mt-4 w-full" type="button" onClick={onClose}>Готово</Button></section></div>; }
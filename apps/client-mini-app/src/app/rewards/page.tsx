"use client";

import { useState } from "react";
import { Button } from "@nodex/ui";
import { Card, ClientHeader, ClientShell, StatusPill } from "../client-ui";

const history = [
  ["Nukus → Urgench", "+2 tickets", "Завершено"],
  ["Nukus → Khiva", "+1 ticket", "Проверка"],
  ["Invite bonus", "+4 tickets", "Начислено"],
];

export default function ClientRewardsPage() {
  const [detailOpen, setDetailOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <ClientShell active="profile">
      <ClientHeader backHref="/profile" level="secondary" title="Rewards" subtitle="Билеты, прогресс и история" />
      <Card className="mt-4 space-y-3">
        <div className="flex items-start justify-between gap-3"><div><h1 className="m-0 text-2xl font-black">7 билетов</h1><p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">До следующего бонуса осталось 3 билета.</p></div><StatusPill tone="accent">70%</StatusPill></div>
        <div className="h-3 overflow-hidden rounded-full bg-[rgb(var(--canvas))]"><div className="h-full w-[70%] rounded-full bg-[rgb(var(--primary))]" /></div>
        <div className="grid grid-cols-2 gap-2"><Button type="button" onClick={() => setDetailOpen(true)}>Детали прогресса</Button><Button type="button" variant="secondary" onClick={() => setHistoryOpen(true)}>История</Button></div>
      </Card>
      <Card className="mt-3 space-y-2" compact><h2 className="m-0 text-lg font-black">Последние начисления</h2>{history.map(([route, tickets, status]) => <button key={route} className="grid w-full grid-cols-[1fr_auto] rounded-[18px] border-0 bg-[rgb(var(--canvas))] p-3 text-left text-sm" type="button" onClick={() => setDetailOpen(true)}><span><strong>{route}</strong><span className="mt-1 block text-xs font-semibold text-[rgb(var(--text-muted))]">{status}</span></span><StatusPill tone="accent">{tickets}</StatusPill></button>)}</Card>
      {detailOpen ? <RewardModal title="Детали билета" onClose={() => setDetailOpen(false)}><p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">Билеты начисляются после завершённой поездки, проверки маршрута и отсутствия fraud-флагов.</p><div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-black"><span className="rounded-[14px] bg-[rgb(var(--canvas))] p-3">5 готово</span><span className="rounded-[14px] bg-[rgb(var(--surface-tint))] p-3">2 проверка</span><span className="rounded-[14px] bg-[rgb(var(--canvas))] p-3">0 отказ</span></div></RewardModal> : null}
      {historyOpen ? <RewardModal title="История Rewards" onClose={() => setHistoryOpen(false)}>{history.map(([route, tickets, status]) => <div key={route} className="mb-2 rounded-[16px] bg-[rgb(var(--canvas))] p-3 text-sm font-semibold"><strong>{route}</strong><span className="float-right">{tickets}</span><div className="text-xs text-[rgb(var(--text-muted))]">{status}</div></div>)}</RewardModal> : null}
    </ClientShell>
  );
}

function RewardModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[rgb(var(--foreground)/0.28)] p-4" role="dialog" aria-modal="true"><section className="w-full max-w-[360px] rounded-[26px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-floating)]"><div className="mb-3 flex items-center justify-between gap-3"><h2 className="m-0 text-lg font-black">{title}</h2><button className="h-9 w-9 rounded-full border-0 bg-[rgb(var(--canvas))] text-lg font-black" type="button" onClick={onClose}>×</button></div>{children}<Button className="mt-4 w-full" type="button" onClick={onClose}>Готово</Button></section></div>;
}
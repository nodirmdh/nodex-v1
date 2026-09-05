"use client";

import { useMemo, useState } from "react";
import { Button } from "@nodex/ui";
import { Card, ClientHeader, ClientShell, StatusPill } from "../client-ui";

type ModalKey = "progress" | "drawing" | "history" | "referral" | null;

const activity = [
  { title: "Nukus → Urgench", meta: "Награда за поездку", value: "+2 билета", status: "Начислено", tone: "success" },
  { title: "Aziza приглашена", meta: "Реферальная награда", value: "+4 билета", status: "Начислено", tone: "success" },
  { title: "Весенняя акция", meta: "Награда за промокод", value: "+1 билет", status: "На проверке", tone: "warning" },
  { title: "Заявка по багажу", meta: "Отклонено после проверки", value: "0 билетов", status: "Отклонено", tone: "danger" },
] as const;

const referrals = [
  ["Aziza", "Приглашён", "Приглашение отправлено"],
  ["Bekzod", "Зарегистрирован", "Зарегистрировался"],
  ["Madina", "На проверке", "Первая поездка на проверке"],
  ["Sherzod", "Начислено", "Условия выполнены"],
  ["Dilnoza", "Начислено", "Бонус начислен"],
];

export default function ClientRewardsPage() {
  const [modal, setModal] = useState<ModalKey>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoState, setPromoState] = useState<"idle" | "success" | "error">("idle");
  const [joinedDrawing, setJoinedDrawing] = useState(false);
  const [shared, setShared] = useState(false);
  const tripsToNext = Math.max(0, 10 - 7);

  const promoMessage = useMemo(() => {
    if (promoState === "success") return "Промокод ENVO20 активирован: +1 билет после следующей поездки.";
    if (promoState === "error") return "Код не найден в demo state. Попробуйте ENVO20.";
    return "Введите код партнёра или сезонной акции.";
  }, [promoState]);

  function applyPromo() {
    setPromoState(promoCode.trim().toUpperCase() === "ENVO20" ? "success" : "error");
  }

  return (
    <ClientShell active="profile">
      <ClientHeader backHref="/profile" level="secondary" title="Награды" subtitle="Билеты, розыгрыши и промокоды" />

      <Card className="mt-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="m-0 text-2xl font-black">7 билетов</h1>
            <p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">Ещё {tripsToNext} поездки до следующей награды.</p>
          </div>
          <StatusPill tone="accent">70%</StatusPill>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-[rgb(var(--canvas))]"><div className="h-full w-[70%] rounded-full bg-[rgb(var(--primary))]" /></div>
        <div className="grid grid-cols-3 gap-2 text-center"><Metric label="Рефералы" value="3/5" /><Metric label="Билеты" value={joinedDrawing ? "4" : "3"} /><Metric label="На проверке" value="2" /></div>
        <div className="grid grid-cols-2 gap-2"><Button type="button" onClick={() => setModal("progress")}>Прогресс</Button><Button type="button" variant="secondary" onClick={() => setModal("history")}>История</Button></div>
      </Card>

      <Card className="mt-3 space-y-3">
        <div className="flex items-start justify-between gap-3"><div><h2 className="m-0 text-lg font-black">Розыгрыш недели</h2><p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">Сертификат на 500 000 UZS для междугородних поездок.</p></div><StatusPill tone="info">до 18 июн</StatusPill></div>
        <div className="rounded-[20px] bg-[rgb(var(--canvas))] p-3"><div className="text-sm font-black">Ваши билеты участвуют: {joinedDrawing ? "4" : "3"}</div><div className="mt-1 text-xs font-semibold text-[rgb(var(--text-muted))]">Правило: 1 билет = 1 участие, только завершённые поездки без флагов проверки.</div></div>
        <div className="grid grid-cols-2 gap-2"><Button type="button" onClick={() => setModal("drawing")}>Детали приза</Button><Button type="button" variant="secondary" onClick={() => setJoinedDrawing(true)}>{joinedDrawing ? "Участвуете" : "Участвовать"}</Button></div>
      </Card>

      <Card className="mt-3 space-y-3">
        <h2 className="m-0 text-lg font-black">Рефералы</h2>
        <div className="flex items-center justify-between gap-3 rounded-[18px] bg-[rgb(var(--canvas))] p-3"><div><div className="text-xs font-bold text-[rgb(var(--text-muted))]">Ваш код</div><div className="text-lg font-black">ENVO-AZIZ-7</div></div><Button type="button" variant="secondary" onClick={() => setShared(true)}>{shared ? "Ссылка готова" : "Поделиться"}</Button></div>
        <button className="w-full rounded-[18px] border-0 bg-[rgb(var(--surface-tint))] p-3 text-left text-sm font-black text-[rgb(var(--primary))]" type="button" onClick={() => setModal("referral")}>5 приглашённых · посмотреть статусы</button>
      </Card>

      <Card className="mt-3 space-y-3">
        <h2 className="m-0 text-lg font-black">Промокод</h2>
        <div className="grid grid-cols-[1fr_auto] gap-2"><input aria-label="Промокод" className="min-h-11 rounded-[16px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm font-black outline-none" onChange={(event) => setPromoCode(event.target.value)} placeholder="ENVO20" value={promoCode} /><Button type="button" onClick={applyPromo}>Применить</Button></div>
        <p className={`m-0 text-sm font-semibold ${promoState === "error" ? "text-[rgb(var(--destructive))]" : "text-[rgb(var(--text-muted))]"}`}>{promoMessage}</p>
        {promoState === "success" ? <StatusPill tone="success">Промокод активен: ENVO20</StatusPill> : null}
      </Card>

      <Card className="mt-3 space-y-2" compact><h2 className="m-0 text-lg font-black">Недавние награды</h2>{activity.map((item) => <button key={item.title} className="grid w-full grid-cols-[1fr_auto] rounded-[18px] border-0 bg-[rgb(var(--canvas))] p-3 text-left text-sm" type="button" onClick={() => setModal("history")}><span><strong>{item.title}</strong><span className="mt-1 block text-xs font-semibold text-[rgb(var(--text-muted))]">{item.meta} · {item.value}</span></span><StatusPill tone={item.tone}>{item.status}</StatusPill></button>)}</Card>

      {modal ? <RewardModal title={modalTitle(modal)} onClose={() => setModal(null)}>{modal === "progress" ? <ProgressDetail /> : null}{modal === "drawing" ? <DrawingDetail joined={joinedDrawing} onJoin={() => setJoinedDrawing(true)} /> : null}{modal === "history" ? <HistoryDetail /> : null}{modal === "referral" ? <РефералыDetail /> : null}</RewardModal> : null}
    </ClientShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3"><div className="text-sm font-black">{value}</div><div className="mt-1 text-[10px] font-bold text-[rgb(var(--text-muted))]">{label}</div></div>; }
function modalTitle(modal: Exclude<ModalKey, null>) { return { progress: "Детали прогресса", drawing: "Розыгрыш", history: "История наград", referral: "Рефералы статусы" }[modal]; }
function ProgressDetail() { return <div className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-muted))]"><div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3">7/10 прогресс награды · 3 поездки до бонуса</div><div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3">Рефералы progress: 3/5 Начислено invites</div><div className="rounded-[16px] bg-[rgb(var(--warning-soft))] p-3 text-[rgb(var(--warning))]">2 начисления ожидают проверку</div></div>; }
function DrawingDetail({ joined, onJoin }: { joined: boolean; onJoin: () => void }) { return <div className="grid gap-3 text-sm font-semibold text-[rgb(var(--text-muted))]"><div className="rounded-[18px] bg-[rgb(var(--surface-tint))] p-3 text-[rgb(var(--primary))]"><strong className="block text-base">Сертификат на поездки 500 000 UZS</strong>Розыгрыш активен до 18 июня.</div><div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3">Условия: подтверждённый клиент, билеты за завершённые поездки, без отклонённых проверок.</div><Button type="button" onClick={onJoin}>{joined ? "Вы уже участвуете" : "Участвовать"}</Button></div>; }
function HistoryDetail() { return <div className="grid gap-2">{activity.map((item) => <div key={item.title} className="rounded-[16px] bg-[rgb(var(--canvas))] p-3 text-sm"><strong>{item.title}</strong><div className="mt-1 text-xs font-semibold text-[rgb(var(--text-muted))]">{item.meta} · {item.value}</div><div className="mt-2"><StatusPill tone={item.tone}>{item.status}</StatusPill></div></div>)}</div>; }
function РефералыDetail() { return <div className="grid gap-2">{referrals.map(([name, state, note]) => <div key={name} className="rounded-[16px] bg-[rgb(var(--canvas))] p-3 text-sm"><div className="flex items-center justify-between gap-2"><strong>{name}</strong><StatusPill tone={state === "Начислено" || state === "Начислено" ? "success" : state === "На проверке" ? "warning" : "neutral"}>{state}</StatusPill></div><div className="mt-1 text-xs font-semibold text-[rgb(var(--text-muted))]">{note}</div></div>)}</div>; }
function RewardModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-50 grid place-items-end bg-[rgb(var(--foreground)/0.28)] p-3 sm:place-items-center" role="dialog" aria-modal="true"><section className="w-full max-w-[390px] rounded-[26px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-floating)]"><div className="mb-3 flex items-center justify-between gap-3"><h2 className="m-0 text-lg font-black">{title}</h2><button className="h-9 w-9 rounded-full border-0 bg-[rgb(var(--canvas))] text-lg font-black" type="button" onClick={onClose}>×</button></div>{children}<Button className="mt-4 w-full" type="button" onClick={onClose}>Готово</Button></section></div>; }

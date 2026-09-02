"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatUzs } from "@nodex/ui";
import { Avatar, Card, ClientHeader, ClientShell, Icon, StatusPill } from "../../client-ui";

type DetailState = "upcoming" | "active" | "completed" | "cancelled";
type DelayState = "ON_TIME" | "SLIGHT_DELAY" | "DELAYED" | "CRITICAL_DELAY";
type ProtectionStage = "idle" | "detected" | "searching" | "found" | "confirming" | "accepted" | "none";

const delayCopy = {
  ON_TIME: { label: "Вовремя", eta: "08:30", delay: "0 минут", tone: "success" as const, body: "Водитель едет по расписанию." },
  SLIGHT_DELAY: { label: "Небольшая задержка", eta: "08:38", delay: "8 минут", tone: "warning" as const, body: "Водитель предупредил о небольшой задержке." },
  DELAYED: { label: "Водитель задерживается", eta: "08:42", delay: "12 минут", tone: "warning" as const, body: "Мы следим за ETA и держим поддержку рядом." },
  CRITICAL_DELAY: { label: "Критическая задержка", eta: "09:05", delay: "35 минут", tone: "danger" as const, body: "ENVO Protection может подобрать замену." },
};

const reasons = ["изменились планы", "водитель задерживается", "нашёл другой транспорт", "ошибка при бронировании", "другое"];

export default function BookingDetailPage() {
  const [state, setState] = useState<DetailState>("upcoming");
  const [delayState, setDelayState] = useState<DelayState>("ON_TIME");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState(reasons[0]!);
  const [cancelConfirmed, setCancelConfirmed] = useState(false);
  const [protection, setProtection] = useState<ProtectionStage>("idle");
  const copy = useMemo(() => delayCopy[delayState], [delayState]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("state");
    if (next === "active" || next === "completed" || next === "cancelled") setState(next);
  }, []);

  function simulateLateCancellation() {
    setProtection("detected");
    setDelayState("CRITICAL_DELAY");
  }

  return (
    <ClientShell active="trips">
      <ClientHeader backHref="/bookings" level="secondary" title="ENVO Protection" subtitle="Nukus → Urgench" />

      <Card className="mt-4 space-y-3" compact label="Trip reliability state">
        <div className="flex items-start justify-between gap-3"><div><p className="m-0 text-xs font-black uppercase tracking-[0.12em] text-[rgb(var(--primary))]">{state === "cancelled" ? "Отменено" : "Поездка подтверждена"}</p><h1 className="m-0 mt-1 text-[22px] font-black leading-tight">{copy.label}</h1><p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">{copy.body}</p></div><StatusPill tone={copy.tone}>{copy.delay}</StatusPill></div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-[22px] bg-[rgb(var(--canvas))] p-3"><div><div className="text-2xl font-black">08:30</div><div className="text-sm font-bold text-[rgb(var(--text-muted))]">Nukus</div></div><div className="grid place-items-center text-[rgb(var(--primary))]"><Icon name="car" className="h-5 w-5" /><span className="text-[11px] font-black text-[rgb(var(--text-muted))]">ETA {copy.eta}</span></div><div className="text-right"><div className="text-2xl font-black">11:30</div><div className="text-sm font-bold text-[rgb(var(--text-muted))]">Urgench</div></div></div>
        <div className="rounded-[18px] bg-[rgb(var(--canvas))] p-3 text-sm font-semibold text-[rgb(var(--text-muted))]">Если ситуация изменилась, напишите водителю или поддержке. Состояние поездки обновится автоматически.</div>
        <div className="grid grid-cols-2 gap-2"><Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--canvas))] px-3 text-center text-xs font-black text-[rgb(var(--primary))] no-underline" href="/messages/driver-azizbek">Написать</Link><Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--canvas))] px-3 text-center text-xs font-black text-[rgb(var(--primary))] no-underline" href="/support?tripId=phase6-booking-confirmed">Поддержка</Link></div>
        {delayState === "CRITICAL_DELAY" ? <button className="min-h-11 w-full rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))]" type="button" onClick={() => setProtection("searching")}>Найти замену</button> : null}
      </Card>

      <Card className="mt-3 space-y-3" compact label="ENVO Protection">
        <div className="flex items-start justify-between gap-3"><div><h2 className="m-0 text-lg font-black">ENVO Protection</h2><p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">Если водитель отменит поездку перед выездом, мы постараемся быстро найти замену.</p></div><Icon name="shield" className="h-6 w-6 text-[rgb(var(--primary))]" /></div>
        <ProtectionProgress stage={protection} />
        {protection === "idle" ? <button className="min-h-11 w-full rounded-full border-0 bg-[rgb(var(--foreground))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))]" type="button" onClick={simulateLateCancellation}>Демо: водитель отменил</button> : null}
        {protection === "detected" ? <button className="min-h-11 w-full rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))]" type="button" onClick={() => setProtection("searching")}>Начать поиск замены</button> : null}
        {protection === "searching" ? <div className="grid grid-cols-2 gap-2"><button className="min-h-11 rounded-full border-0 bg-[rgb(var(--primary))] px-3 text-sm font-black text-[rgb(var(--primary-foreground))]" type="button" onClick={() => setProtection("found")}>Замена найдена</button><button className="min-h-11 rounded-full border-0 bg-[rgb(var(--canvas))] px-3 text-sm font-black text-[rgb(var(--text-muted))]" type="button" onClick={() => setProtection("none")}>Не нашли</button></div> : null}
        {protection === "found" || protection === "confirming" || protection === "accepted" ? <ReplacementDriver accepted={protection === "accepted"} onView={() => setProtection("confirming")} onAccept={() => setProtection("accepted")} /> : null}
        {protection === "none" ? <NoReplacement onContinue={() => setProtection("searching")} onCancel={() => setProtection("idle")} /> : null}
      </Card>

      <Card className="mt-3 space-y-3" compact>
        <div className="flex items-center gap-3"><Avatar name="Azizbek Karimov" /><div className="min-w-0 flex-1"><h2 className="m-0 truncate text-base font-black">Azizbek Karimov</h2><p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">Chevrolet Cobalt · надёжность высокая</p></div><StatusPill tone="accent">4.9</StatusPill></div>
        <div className="grid grid-cols-2 gap-2"><Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline" href="/messages/driver-azizbek">Написать водителю</Link><Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--canvas))] px-4 text-sm font-black text-[rgb(var(--primary))] no-underline" href="/safety">Безопасность</Link></div>
      </Card>

      <Card className="mt-3 space-y-3" compact><h2 className="m-0 text-base font-black">Отмена клиентом</h2>{cancelConfirmed ? <div className="rounded-[18px] bg-[rgb(var(--warning-soft))] p-3 text-sm font-semibold text-[rgb(var(--warning))]">Демо-отмена сохранена: {cancelReason}. Денежные операции не выполнялись.</div> : null}<button className="min-h-11 w-full rounded-full bg-[rgb(var(--canvas))] px-4 text-sm font-black text-[rgb(var(--text-muted))]" type="button" onClick={() => setCancelOpen(true)}>Отменить заявку</button></Card>
      {cancelOpen ? <CancelSheet reason={cancelReason} onReason={setCancelReason} onClose={() => setCancelOpen(false)} onConfirm={() => { setCancelConfirmed(true); setCancelOpen(false); setState("cancelled"); }} /> : null}
    </ClientShell>
  );
}

function ProtectionProgress({ stage }: { stage: ProtectionStage }) { const steps = [["detected", "Отмена обнаружена"], ["searching", "Ищем замену"], ["found", "Замена найдена"], ["confirming", "Подтверждение замены"]]; const index = stage === "idle" ? -1 : stage === "none" ? 1 : stage === "accepted" ? 3 : Math.max(0, steps.findIndex(([key]) => key === stage)); return <div className="grid gap-2">{steps.map(([key, label], stepIndex) => <div key={key} className="grid grid-cols-[20px_1fr] gap-2 text-sm"><span className={`mt-1 h-3 w-3 rounded-full ${stepIndex <= index ? "bg-[rgb(var(--primary))]" : "bg-[rgb(var(--border-strong))]"}`} /><span className={stepIndex <= index ? "font-black" : "font-semibold text-[rgb(var(--text-muted))]"}>{label}</span></div>)}</div>; }
function ReplacementDriver({ accepted, onView, onAccept }: { accepted: boolean; onView: () => void; onAccept: () => void }) { return <div className="rounded-[20px] bg-[rgb(var(--canvas))] p-3"><div className="flex items-center gap-3"><Avatar name="Madina Yusupova" /><div className="min-w-0 flex-1"><strong className="block truncate">Madina Yusupova</strong><span className="block text-xs font-semibold text-[rgb(var(--text-muted))]">Chevrolet Tracker · 4.8 · надёжность высокая</span></div><StatusPill tone="success">ETA 08:45</StatusPill></div><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><div className="rounded-[16px] bg-[rgb(var(--surface))] p-3"><strong>{formatUzs(8500000)}</strong><div className="text-xs text-[rgb(var(--text-muted))]">Цена сохранена</div></div><div className="rounded-[16px] bg-[rgb(var(--surface))] p-3"><strong>ENVO Protected</strong><div className="text-xs text-[rgb(var(--text-muted))]">Замена водителя</div></div></div><div className="mt-3 grid grid-cols-2 gap-2"><button className="min-h-10 rounded-full border-0 bg-[rgb(var(--canvas))] px-3 text-xs font-black text-[rgb(var(--primary))]" type="button" onClick={onView}>Посмотреть водителя</button><button className="min-h-10 rounded-full border-0 bg-[rgb(var(--primary))] px-3 text-xs font-black text-[rgb(var(--primary-foreground))]" type="button" onClick={onAccept}>{accepted ? "Замена принята" : "Принять замену"}</button></div></div>; }
function NoReplacement({ onContinue, onCancel }: { onContinue: () => void; onCancel: () => void }) { return <div className="rounded-[20px] bg-[rgb(var(--warning-soft))] p-3 text-sm font-semibold text-[rgb(var(--warning))]"><strong className="block">Пока не нашли подходящего водителя</strong><span className="mt-1 block">Можно продолжить поиск, изменить время или связаться с поддержкой.</span><div className="mt-3 grid grid-cols-2 gap-2"><button className="min-h-10 rounded-full border-0 bg-[rgb(var(--primary))] px-3 text-xs font-black text-[rgb(var(--primary-foreground))]" type="button" onClick={onContinue}>Продолжить поиск</button><Link className="inline-flex min-h-10 items-center justify-center rounded-full bg-[rgb(var(--surface))] px-3 text-xs font-black text-[rgb(var(--primary))] no-underline" href="/search?changeTime=1">Изменить время</Link><Link className="inline-flex min-h-10 items-center justify-center rounded-full bg-[rgb(var(--surface))] px-3 text-xs font-black text-[rgb(var(--primary))] no-underline" href="/support?protection=1">Поддержка</Link><button className="min-h-10 rounded-full border-0 bg-[rgb(var(--surface))] px-3 text-xs font-black text-[rgb(var(--text-muted))]" type="button" onClick={onCancel}>Отменить поиск</button></div></div>; }
function CancelSheet({ reason, onReason, onClose, onConfirm }: { reason: string; onReason: (value: string) => void; onClose: () => void; onConfirm: () => void }) { return <div className="fixed inset-0 z-50 grid place-items-end bg-[rgb(var(--foreground)/0.28)] p-3" role="dialog" aria-modal="true"><section className="w-full max-w-[430px] rounded-[26px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-floating)]"><div className="flex items-center justify-between gap-3"><h2 className="m-0 text-lg font-black">Причина отмены</h2><button className="h-9 w-9 rounded-full border-0 bg-[rgb(var(--canvas))] text-lg font-black" type="button" onClick={onClose}>×</button></div><div className="mt-3 grid gap-2">{reasons.map((item) => <button key={item} className={`min-h-10 rounded-[16px] border-0 px-3 text-left text-sm font-black ${reason === item ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "bg-[rgb(var(--canvas))] text-[rgb(var(--foreground))]"}`} type="button" onClick={() => onReason(item)}>{item}</button>)}</div><p className="m-0 mt-3 text-sm font-semibold text-[rgb(var(--text-muted))]">Это демо-подтверждение: платежи и реальные отмены не выполняются.</p><button className="mt-3 min-h-11 w-full rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))]" type="button" onClick={onConfirm}>Подтвердить отмену</button></section></div>; }

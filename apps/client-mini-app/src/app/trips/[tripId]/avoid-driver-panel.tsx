"use client";

import { useState } from "react";
import { Badge } from "@nodex/ui";

const reasons = ["грубое общение", "опоздание", "не понравилась поездка", "другое"];

export function AvoidDriverPanel({ driver, vehicle, plate }: { driver: string; vehicle: string; plate: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(reasons[0]!);
  const [saved, setSaved] = useState(false);

  return (
    <div className="mt-3 rounded-[22px] bg-[rgb(var(--canvas))] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-black">Не предлагать водителя</div>
          <div className="mt-1 text-xs font-semibold text-[rgb(var(--text-muted))]">
            {saved ? "Этот водитель больше не будет предлагаться вам." : "ENVO учтет это в будущих рекомендациях."}
          </div>
        </div>
        {saved ? <Badge tone="warning">Скрыт</Badge> : null}
      </div>
      <button
        className="mt-3 min-h-10 w-full rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 text-sm font-black text-[rgb(var(--foreground))]"
        onClick={() => setOpen(true)}
        type="button"
      >
        Больше не предлагать этого водителя
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/35 px-3 pb-3" role="dialog" aria-modal="true" aria-label="Не предлагать водителя">
          <div className="w-full max-w-[430px] rounded-[28px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-floating)]">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[rgb(var(--border-strong))]" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="m-0 text-lg font-black">Скрыть водителя?</h3>
                <p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">
                  {driver} · {vehicle} · {plate}
                </p>
              </div>
              <button className="grid h-9 w-9 place-items-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] text-sm font-black" onClick={() => setOpen(false)} type="button" aria-label="Закрыть">×</button>
            </div>
            <div className="mt-3 grid gap-2">
              {reasons.map((item) => (
                <button
                  key={item}
                  className={`min-h-10 rounded-[16px] border px-3 text-left text-sm font-black ${reason === item ? "border-[rgb(var(--primary))] bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]" : "border-[rgb(var(--border))] bg-[rgb(var(--canvas))] text-[rgb(var(--foreground))]"}`}
                  onClick={() => setReason(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
            <button
              className="mt-3 min-h-12 w-full rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))]"
              onClick={() => {
                setSaved(true);
                setOpen(false);
              }}
              type="button"
            >
              Подтвердить
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

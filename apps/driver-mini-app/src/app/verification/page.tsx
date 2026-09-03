"use client";

import { useEffect, useState } from "react";
import { DriverCard, DriverHeader, DriverPill, DriverShell } from "../driver-ui";

type VerificationState = "approved" | "pending" | "action";

export default function DriverVerificationPage() {
  const [state, setState] = useState<VerificationState>("approved");

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("state");
    if (next === "pending" || next === "action") setState(next);
  }, []);

  const approved = state === "approved";
  const pending = state === "pending";

  return (
    <DriverShell active="profile">
      <DriverHeader
        title="Документы"
        subtitle="Проверка водителя и автомобиля"
        status={
          <DriverPill tone={approved ? "success" : pending ? "warning" : "danger"}>
            {approved ? "Одобрено" : pending ? "На проверке" : "Нужно исправить"}
          </DriverPill>
        }
      />

      <DriverCard className="mt-4 space-y-3" label="Статус проверки">
        <h1 className="m-0 text-xl font-black">
          {approved ? "Документы одобрены" : pending ? "Идёт проверка" : "Обновите документы"}
        </h1>
        <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
          {approved
            ? "Профиль готов: можно публиковать маршруты и принимать заявки."
            : pending
              ? "Документы отправлены на проверку, повторно загружать их не нужно."
              : "Некоторые данные нужно исправить перед одобрением."}
        </p>
        <div className="grid gap-2">
          {["Документ личности", "Водительское удостоверение", "Регистрация автомобиля"].map((item) => (
            <div
              key={item}
              className="flex items-center justify-between rounded-[16px] bg-[rgb(var(--canvas))] p-3"
            >
              <span className="text-sm font-black">{item}</span>
              <DriverPill tone={approved ? "success" : pending ? "warning" : "danger"}>
                {approved ? "Одобрено" : pending ? "Отправлено" : "Исправить"}
              </DriverPill>
            </div>
          ))}
        </div>
        {!approved && !pending && (
          <button
            className="min-h-12 w-full rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))]"
            type="button"
          >
            Отправить заново
          </button>
        )}
      </DriverCard>
    </DriverShell>
  );
}

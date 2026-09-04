"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "../admin-shell";

type QueueState = "queue" | "review" | "approved";

const submissions = [
  {
    driver: "Phase2 Driver 2",
    submitted: "2026-07-30",
    documents: "5/5 complete",
    vehicle: "Chevrolet Cobalt · Approved",
    state: "Pending",
    tone: "warning" as const,
  },
  {
    driver: "Phase2 Driver 3",
    submitted: "2026-07-30",
    documents: "4/5 complete",
    vehicle: "Chevrolet Cobalt · Pending",
    state: "Needs action",
    tone: "danger" as const,
  },
  {
    driver: "Phase2 Driver 4",
    submitted: "2026-07-29",
    documents: "5/5 complete",
    vehicle: "Chevrolet Tracker · Approved",
    state: "Approved",
    tone: "success" as const,
  },
];

export default function VerificationPage() {
  const [state, setState] = useState<QueueState>("queue");

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("state");
    if (next === "review" || next === "approved") setState(next);
  }, []);

  return (
    <main className="p-5">
      <AdminPageHeader
        title="Verification"
        subtitle="Review driver submissions, document completeness, and decision history."
        actions={
          <>
            <button className="min-h-9 rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm font-black">
              Export queue
            </button>
            <button className="min-h-9 rounded-[10px] bg-[rgb(var(--primary))] px-3 text-sm font-black text-[rgb(var(--primary-foreground))]">
              Assign next
            </button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {[
          ["queue", "Pending"],
          ["review", "Review"],
          ["approved", "Одобрено"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={[
              "min-h-9 rounded-[10px] border px-3 text-sm font-black",
              state === key
                ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                : "border-[rgb(var(--border))] bg-[rgb(var(--surface))]",
            ].join(" ")}
            onClick={() => setState(key as QueueState)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {state === "queue" && <VerificationQueue />}
      {state === "review" && <VerificationReview approved={false} />}
      {state === "approved" && <VerificationReview approved />}
    </main>
  );
}

function VerificationQueue() {
  return (
    <AdminPanel className="overflow-hidden" label="Verification queue">
      <div className="border-b border-[rgb(var(--border))] px-4 py-3">
        <h1 className="m-0 text-lg font-black">Driver verification queue</h1>
        <p className="m-0 mt-1 text-sm text-[rgb(var(--text-muted))]">
          Pending submissions are sorted by operational urgency.
        </p>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead className="bg-[rgb(var(--canvas))]">
          <tr>
            {["Водитель", "Отправлено", "Документы", "Автомобиль", "Статус", "Действие"].map((header) => (
              <th
                key={header}
                className="border-b border-[rgb(var(--border))] px-4 py-2 text-left text-[11px] font-black uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {submissions.map((submission) => (
            <tr key={submission.driver} className="hover:bg-[rgb(var(--surface-muted))]">
              <td className="border-b border-[rgb(var(--border))] px-4 py-3 font-black">
                {submission.driver}
              </td>
              <td className="border-b border-[rgb(var(--border))] px-4 py-3">
                {submission.submitted}
              </td>
              <td className="border-b border-[rgb(var(--border))] px-4 py-3">
                {submission.documents}
              </td>
              <td className="border-b border-[rgb(var(--border))] px-4 py-3">
                {submission.vehicle}
              </td>
              <td className="border-b border-[rgb(var(--border))] px-4 py-3">
                <AdminStatusBadge tone={submission.tone}>{submission.state}</AdminStatusBadge>
              </td>
              <td className="border-b border-[rgb(var(--border))] px-4 py-3">
                <button
                  className="min-h-8 rounded-[10px] bg-[rgb(var(--primary))] px-3 text-xs font-black text-[rgb(var(--primary-foreground))]"
                  type="button"
                >
                  Review
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminPanel>
  );
}

function VerificationReview({ approved }: { approved: boolean }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <AdminPanel className="overflow-hidden" label="Verification review">
        <div className="border-b border-[rgb(var(--border))] px-4 py-3">
          <h1 className="m-0 text-lg font-black">
            {approved ? "Проверка одобрена" : "Проверить Phase2 Driver 2"}
          </h1>
          <p className="m-0 mt-1 text-sm text-[rgb(var(--text-muted))]">
            Metadata is shown honestly when document preview is unavailable.
          </p>
        </div>
        <div className="grid gap-3 p-4 lg:grid-cols-2">
          {[
            "Identity document",
            "Driver license",
            "Vehicle registration",
            "Selfie",
            "Vehicle front",
          ].map((doc) => (
            <div
              key={doc}
              className="rounded-[12px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="m-0 text-sm font-black">{doc}</h2>
                <AdminStatusBadge tone={approved ? "success" : "warning"}>
                  {approved ? "Approved" : "Submitted"}
                </AdminStatusBadge>
              </div>
              <div className="mt-3 rounded-[10px] bg-[rgb(var(--surface))] p-3 text-xs text-[rgb(var(--text-muted))]">
                файл: {doc.toLowerCase().replaceAll(" ", "-")}.pdf · отправлено 2026-07-30
              </div>
            </div>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel className="p-4" label="Verification decision panel">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-xl font-black">Phase2 Driver 2</h2>
            <p className="m-0 text-sm text-[rgb(var(--text-muted))]">+998 ** *** 0002</p>
          </div>
          <AdminStatusBadge tone={approved ? "success" : "warning"}>
            {approved ? "Approved" : "Pending"}
          </AdminStatusBadge>
        </div>

        <div className="my-4 grid gap-2 text-sm">
          <Row label="Vehicle" value="Chevrolet Cobalt" />
          <Row label="Plate" value="95 A 214 QA" />
          <Row label="Documents" value="5/5 complete" />
          <Row label="Duplicate check" value="Clear" />
        </div>

        {!approved ? (
          <div className="grid gap-2">
            <button
              className="min-h-10 rounded-[10px] border-0 bg-[rgb(var(--primary))] px-3 text-sm font-black text-[rgb(var(--primary-foreground))]"
              type="button"
            >
              Approve
            </button>
            <button
              className="min-h-10 rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm font-black"
              type="button"
            >
              Request correction
            </button>
            <button
              className="min-h-10 rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm font-black"
              type="button"
            >
              Reject
            </button>
            <div className="rounded-[12px] bg-[rgb(var(--foreground))] p-3 text-[rgb(var(--primary-foreground))]">
              <h3 className="m-0 text-base font-black">Approve driver verification?</h3>
              <p className="m-0 mt-1 text-sm opacity-80">Phase2 Driver 2 · 5 documents reviewed</p>
              <button
                className="mt-3 min-h-9 w-full rounded-[10px] border-0 bg-[rgb(var(--primary))] px-3 text-sm font-black text-[rgb(var(--primary-foreground))]"
                type="button"
              >
                Approve driver
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-[12px] bg-[rgb(var(--success-soft))] p-3 text-sm font-semibold text-[rgb(var(--success))]">
            Driver verification is approved. The driver can publish trips while subscription access
            is active.
          </div>
        )}
      </AdminPanel>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3">
      <span className="text-[rgb(var(--text-muted))]">{label}</span>
      <strong className="text-right">{value}</strong>
    </div>
  );
}

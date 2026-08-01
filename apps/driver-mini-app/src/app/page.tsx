"use client";

import { useMemo, useState } from "react";
import { AppHeader, Badge, BottomNav, Button, Panel, Timeline } from "@nodex/ui";

const steps = [
  "Личные данные",
  "Документ личности",
  "Водительские права",
  "Данные автомобиля",
  "Фото автомобиля",
  "Проверка",
  "Согласие",
];

const documents = [
  { label: "ID front", status: "Uploaded" },
  { label: "Driver license", status: "Uploaded" },
  { label: "Vehicle registration", status: "Missing" },
  { label: "Selfie", status: "Uploaded" },
  { label: "Vehicle front", status: "Missing" },
];

export default function DriverHome() {
  const [step, setStep] = useState(0);
  const completion = useMemo(() => Math.round(((step + 1) / steps.length) * 100), [step]);

  return (
    <main className="nodex-app mobile-shell pb-24">
      <AppHeader title="Driver verification" subtitle="Documents, review status, and history" />
      <div className="space-y-4 px-4">
        <Panel className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm text-slate-500">Current status</div>
              <div className="text-xl font-black">Draft</div>
            </div>
            <Badge tone="warning">Autosaved</Badge>
          </div>
          <div
            aria-label="Verification progress"
            className="h-2 overflow-hidden rounded-full bg-[rgb(var(--surface-muted))]"
          >
            <div
              className="h-full rounded-full bg-[rgb(var(--primary))]"
              style={{ width: `${completion}%` }}
            />
          </div>
          <div className="grid grid-cols-7 gap-1" aria-label="Verification steps">
            {steps.map((item, index) => (
              <button
                key={item}
                className={`h-10 rounded-[var(--radius-sm)] border text-xs font-semibold ${
                  index === step
                    ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))] text-white"
                    : index < step
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-[rgb(var(--border))] bg-white text-slate-500"
                }`}
                onClick={() => setStep(index)}
                type="button"
              >
                {index + 1}
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="space-y-4">
          <div>
            <h1 className="m-0 text-lg font-black">{steps[step]}</h1>
            <div className="text-sm text-slate-500">
              Save a draft, upload documents, then submit.
            </div>
          </div>

          {step === 0 && (
            <div className="grid gap-3">
              {["Legal first name", "Legal last name", "Phone", "PIN"].map((label) => (
                <label key={label} className="grid gap-1 text-sm font-semibold">
                  {label}
                  <input
                    className="min-h-11 rounded-[var(--radius-md)] border border-[rgb(var(--border))] px-3 text-base"
                    defaultValue={label === "Phone" ? "+998 90 000 00 00" : ""}
                  />
                </label>
              ))}
            </div>
          )}

          {(step === 1 || step === 2 || step === 4) && (
            <div className="grid gap-2">
              {documents.map((document) => (
                <div
                  key={document.label}
                  className="flex min-h-14 items-center justify-between rounded-[var(--radius-md)] border border-[rgb(var(--border))] px-3"
                >
                  <div className="text-sm font-semibold">{document.label}</div>
                  <Badge tone={document.status === "Uploaded" ? "success" : "warning"}>
                    {document.status}
                  </Badge>
                </div>
              ))}
              <Button className="min-h-12">Upload document</Button>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-3">
              {["Make", "Model", "Year", "Plate", "Seats"].map((label) => (
                <label key={label} className="grid gap-1 text-sm font-semibold">
                  {label}
                  <input className="min-h-11 rounded-[var(--radius-md)] border border-[rgb(var(--border))] px-3 text-base" />
                </label>
              ))}
            </div>
          )}

          {step === 5 && (
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
                <span>Personal data</span>
                <Badge tone="success">Ready</Badge>
              </div>
              <div className="flex justify-between rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
                <span>Documents</span>
                <Badge tone="warning">2 missing</Badge>
              </div>
              <div className="flex justify-between rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
                <span>Vehicle data</span>
                <Badge tone="success">Ready</Badge>
              </div>
            </div>
          )}

          {step === 6 && (
            <label className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[rgb(var(--border))] p-3 text-sm">
              <input className="mt-1" type="checkbox" />
              <span>I confirm that the data is accurate and agree to document verification.</span>
            </label>
          )}
        </Panel>

        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">History</h2>
          <Timeline
            items={[
              { label: "Draft created", time: "Today", active: true },
              { label: "Documents autosaved", time: "Pending upload" },
              { label: "Admin review", time: "After submission" },
            ]}
          />
        </Panel>
      </div>

      <div className="fixed inset-x-0 bottom-14 mx-auto max-w-[430px] border-t border-[rgb(var(--border))] bg-white/95 p-4 backdrop-blur">
        <div className="grid grid-cols-2 gap-2">
          <Button
            className="min-h-12"
            disabled={step === 0}
            onClick={() => setStep((value) => Math.max(0, value - 1))}
            variant="secondary"
          >
            Back
          </Button>
          <Button
            className="min-h-12"
            onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))}
          >
            {step === steps.length - 1 ? "Submit" : "Next"}
          </Button>
        </div>
      </div>

      <BottomNav
        items={[
          { label: "Verify", active: true },
          { label: "Status" },
          { label: "History" },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}

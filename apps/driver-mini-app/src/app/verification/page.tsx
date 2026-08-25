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
        title="Verification"
        subtitle="Documents and status"
        status={
          <DriverPill tone={approved ? "success" : pending ? "warning" : "danger"}>
            {approved ? "Approved" : pending ? "Under review" : "Action required"}
          </DriverPill>
        }
      />

      <DriverCard className="mt-4 space-y-3" label="Driver verification status">
        <h1 className="m-0 text-xl font-black">
          {approved ? "Verification approved" : pending ? "Review in progress" : "Update documents"}
        </h1>
        <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
          {approved
            ? "Your profile is ready to publish trips and manage passenger requests."
            : pending
              ? "Submitted documents are being reviewed. You do not need to upload them again."
              : "Some submitted details need correction before approval."}
        </p>
        <div className="grid gap-2">
          {["Identity document", "Driver license", "Vehicle registration"].map((item) => (
            <div
              key={item}
              className="flex items-center justify-between rounded-[16px] bg-[rgb(var(--canvas))] p-3"
            >
              <span className="text-sm font-black">{item}</span>
              <DriverPill tone={approved ? "success" : pending ? "warning" : "danger"}>
                {approved ? "Approved" : pending ? "Submitted" : "Needs update"}
              </DriverPill>
            </div>
          ))}
        </div>
        {!approved && !pending && (
          <button
            className="min-h-12 w-full rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))]"
            type="button"
          >
            Resubmit documents
          </button>
        )}
      </DriverCard>
    </DriverShell>
  );
}

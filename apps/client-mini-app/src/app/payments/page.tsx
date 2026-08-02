"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader, Badge, BottomNav, Button, Panel, formatUzs } from "@nodex/ui";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3103";

type PaymentResult = {
  payment?: {
    id: string;
    status: string;
    method: string;
    provider: string | null;
    amountMinor: string;
    currency: string;
    refundableMinor: string;
    intent?: { status: string; providerReference: string | null } | null;
  };
  error?: { code: string; message: string };
};

export default function ClientPaymentsPage() {
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function createPayment(method: "CASH" | "ONLINE") {
    setLoading(true);
    const response = await fetch(`${apiBase}/api/v1/payments/intents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": `client-demo-${method.toLowerCase()}`,
      },
      body: JSON.stringify({
        targetType: "BOOKING",
        targetId: "phase6-booking-hold",
        method,
        provider: method === "ONLINE" ? "MOCK" : "MANUAL",
      }),
    });
    setResult((await response.json()) as PaymentResult);
    setLoading(false);
  }

  async function requestRefund() {
    if (!result?.payment) return;
    setLoading(true);
    const response = await fetch(`${apiBase}/api/v1/payments/${result.payment.id}/refunds`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": `client-demo-refund-${result.payment.id}`,
      },
      body: JSON.stringify({
        paymentId: result.payment.id,
        reason: "CLIENT_CANCELLATION",
      }),
    });
    setResult((await response.json()) as PaymentResult);
    setLoading(false);
  }

  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="Payments" subtitle="Cash, online status, and refund requests" />
      <div className="space-y-4 px-4">
        <Panel className="space-y-3" aria-label="Client payment checkout">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="m-0 text-lg font-black">Checkout</h1>
              <p className="m-0 text-sm text-slate-500">Booking payment without creating holds.</p>
            </div>
            <Badge tone="info">UZS minor units</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={() => createPayment("CASH")}
            >
              Pay cash
            </Button>
            <Button type="button" disabled={loading} onClick={() => createPayment("ONLINE")}>
              Pay online
            </Button>
          </div>
        </Panel>

        <Panel className="space-y-3" aria-label="Payment status">
          <h2 className="m-0 text-base font-bold">Payment status</h2>
          {result?.payment ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-500">{result.payment.method}</span>
                <Badge tone={result.payment.status === "SUCCEEDED" ? "success" : "warning"}>
                  {result.payment.status}
                </Badge>
              </div>
              <strong>{formatUzs(Number(result.payment.amountMinor))}</strong>
              <p className="m-0 text-sm text-slate-500">
                Refundable: {formatUzs(Number(result.payment.refundableMinor))}
              </p>
              {result.payment.intent && (
                <p className="m-0 text-sm text-slate-500">
                  Intent {result.payment.intent.status} -{" "}
                  {result.payment.intent.providerReference ?? "manual"}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={loading}
                  onClick={requestRefund}
                >
                  Request refund
                </Button>
                <Link className="text-sm font-semibold text-[rgb(var(--primary))]" href="/bookings">
                  Bookings
                </Link>
              </div>
            </>
          ) : (
            <p className="m-0 text-sm text-slate-500">
              Choose a payment method to see provider-safe status details.
            </p>
          )}
          {result?.error && <Badge tone="danger">{result.error.code}</Badge>}
        </Panel>
      </div>
      <BottomNav
        items={[
          { label: "Home" },
          { label: "Search" },
          { label: "Bookings" },
          { label: "Pay", active: true },
        ]}
      />
    </main>
  );
}

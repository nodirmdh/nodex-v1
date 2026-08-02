import { Badge, Button, Panel, formatUzs } from "@nodex/ui";

const payments = [
  {
    id: "pay-online",
    target: "Booking",
    method: "ONLINE",
    status: "SUCCEEDED",
    amountMinor: 17000000,
    provider: "MOCK",
  },
  {
    id: "pay-cash",
    target: "Parcel",
    method: "CASH",
    status: "CASH_DECLARED",
    amountMinor: 4500000,
    provider: "MANUAL",
  },
  {
    id: "pay-refund",
    target: "Booking",
    method: "ONLINE",
    status: "REFUND_PENDING",
    amountMinor: 9500000,
    provider: "MOCK",
  },
];

const ledger = [
  { account: "provider_cash", type: "DEBIT", amountMinor: 17000000 },
  { account: "platform_fee_revenue", type: "CREDIT", amountMinor: 1700000 },
  { account: "driver_earnings_payable", type: "CREDIT", amountMinor: 15300000 },
];

function tone(status: string) {
  if (status === "SUCCEEDED" || status === "PAID") return "success";
  if (status.includes("REFUND") || status.includes("PENDING")) return "warning";
  return "info";
}

export default function AdminFinancePage() {
  return (
    <main className="space-y-4 p-5">
      <Panel className="space-y-3" aria-label="Finance overview">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="m-0 text-lg font-black">Finance</h1>
            <p className="m-0 text-sm text-slate-500">
              Payments, refunds, cash settlement, ledger, reconciliation, and payout controls.
            </p>
          </div>
          <Badge tone="info">Provider agnostic</Badge>
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
            <strong>{formatUzs(26500000)}</strong>
            <span className="block text-sm text-slate-500">Gross payments</span>
          </div>
          <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
            <strong>{formatUzs(2600000)}</strong>
            <span className="block text-sm text-slate-500">Platform fees</span>
          </div>
          <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
            <strong>{formatUzs(23900000)}</strong>
            <span className="block text-sm text-slate-500">Driver payable</span>
          </div>
          <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
            <strong>Matched</strong>
            <span className="block text-sm text-slate-500">Reconciliation</span>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm" aria-label="Admin payment list">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="p-2">Payment</th>
                <th className="p-2">Target</th>
                <th className="p-2">Method</th>
                <th className="p-2">Provider</th>
                <th className="p-2">Amount</th>
                <th className="p-2">Status</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-t border-[rgb(var(--border))]">
                  <td className="p-2 font-semibold">{payment.id}</td>
                  <td className="p-2">{payment.target}</td>
                  <td className="p-2">{payment.method}</td>
                  <td className="p-2">{payment.provider}</td>
                  <td className="p-2">{formatUzs(payment.amountMinor)}</td>
                  <td className="p-2">
                    <Badge tone={tone(payment.status)}>{payment.status}</Badge>
                  </td>
                  <td className="p-2">
                    <Button type="button" variant="secondary">
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel className="space-y-3" aria-label="Ledger entries">
          <h2 className="m-0 text-base font-bold">Ledger sample</h2>
          {ledger.map((entry) => (
            <div
              key={`${entry.account}-${entry.type}`}
              className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <strong>{entry.account}</strong>
                <Badge tone={entry.type === "DEBIT" ? "info" : "success"}>{entry.type}</Badge>
              </div>
              <span className="text-sm text-slate-500">{formatUzs(entry.amountMinor)}</span>
            </div>
          ))}
          <Button type="button">Create payout batch</Button>
        </Panel>
      </div>
    </main>
  );
}

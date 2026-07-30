export interface PaymentAdapter {
  createIntent(input: {
    amountMinor: bigint;
    currency: "UZS";
    idempotencyKey: string;
  }): Promise<{ provider: string; reference: string }>;
  getStatus(reference: string): Promise<"PENDING" | "CAPTURED" | "FAILED">;
}

export class ManualCashPaymentAdapter implements PaymentAdapter {
  async createIntent(input: { idempotencyKey: string }) {
    return { provider: "manual_cash", reference: input.idempotencyKey };
  }

  async getStatus() {
    return "PENDING" as const;
  }
}

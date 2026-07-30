export interface NotificationJob {
  dedupeKey: string;
  channel: "telegram" | "in_app" | "email" | "sms";
  recipientUserId: string;
  template: string;
  payload: Record<string, unknown>;
}

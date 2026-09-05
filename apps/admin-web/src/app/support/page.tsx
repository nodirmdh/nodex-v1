import { AdminPageHeader } from "../admin-shell";
import { SupportInboxRealData } from "../admin-real-data";

export default function SupportPage() {
  return <main className="admin-main"><AdminPageHeader title="Поддержка" subtitle="Входящие обращения: контекст поездки, клиент, приоритет и статус." /><SupportInboxRealData /></main>;
}
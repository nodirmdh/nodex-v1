import { AdminPageHeader } from "../../admin-shell";
import { Breadcrumbs, QuickActionModal } from "../../admin-components";
import { SupportTicketRealData } from "../../admin-real-data";

export default async function SupportDetailPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  return <main className="admin-main"><Breadcrumbs items={[{ label: "Админ", href: "/dashboard" }, { label: "Поддержка", href: "/support" }, { label: ticketId }]} /><AdminPageHeader title={ticketId} subtitle="Диалог поддержки, файлы, SLA и связанные сущности." actions={<><QuickActionModal label="Ответить" title="Ответ клиенту" action="Отправить">Ответ будет добавлен в диалог. Изменения пока не сохраняются.</QuickActionModal><QuickActionModal label="Статус" title="Изменить статус обращения">Изменения пока не сохраняются.</QuickActionModal><QuickActionModal label="Назначить" title="Назначить оператора">Изменения пока не сохраняются.</QuickActionModal></>} /><SupportTicketRealData ticketId={ticketId} /></main>;
}
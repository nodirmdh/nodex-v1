import { AdminPageHeader } from "../../admin-shell";
import { Breadcrumbs, QuickActionModal } from "../../admin-components";
import { SupportTicketRealData } from "../../admin-real-data";

export default async function SupportDetailPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  return <main className="admin-main"><Breadcrumbs items={[{ label: "Админ", href: "/dashboard" }, { label: "Поддержка", href: "/support" }, { label: ticketId }]} /><AdminPageHeader title={ticketId} subtitle="Диалог поддержки, файлы, SLA и связанные сущности." actions={<><QuickActionModal label="Ответить" title="Ответ клиенту" action="Отправить demo">Отправка остаётся demo-действием; диалог берётся из live API или demo fallback.</QuickActionModal><QuickActionModal label="Статус" title="Изменить статус обращения">Изменение статуса остаётся demo-действием.</QuickActionModal><QuickActionModal label="Назначить" title="Назначить оператора">Назначение остаётся demo-действием.</QuickActionModal></>} /><SupportTicketRealData ticketId={ticketId} /></main>;
}
import { AdminPageHeader } from "../../admin-shell";
import { Breadcrumbs, QuickActionModal } from "../../admin-components";
import { TripDetailRealData } from "../../admin-real-data";

export default async function TripDetailPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  return <main className="admin-main"><Breadcrumbs items={[{ label: "Админ", href: "/dashboard" }, { label: "Поездки", href: "/trips" }, { label: tripId }]} /><AdminPageHeader title={tripId} subtitle="Детали поездки, пассажиры, история и операционный контекст." actions={<><QuickActionModal label="Кратко" title="Кратко о поездке">Данные поездки показаны в панели ниже или через demo fallback.</QuickActionModal><QuickActionModal label="Статус" title="Изменить статус поездки">Изменение статуса остаётся demo-действием.</QuickActionModal></>} /><TripDetailRealData tripId={tripId} /></main>;
}
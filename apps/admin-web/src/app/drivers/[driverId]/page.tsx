import { AdminPageHeader, AdminPanel } from "../../admin-shell";
import { Breadcrumbs, DetailGrid, LinkedValue, QuickActionModal, Status, Tabs } from "../../admin-components";
import { bookings, driverById, fraudCases, rewards, tickets, trips } from "../../admin-data";

export default async function DriverDetailPage({ params }: { params: Promise<{ driverId: string }> }) {
  const { driverId } = await params;
  const driver = driverById(driverId);
  const driverTrips = trips.filter((trip) => trip.driverId === driver.id);
  return (
    <main className="admin-main">
      <Breadcrumbs items={[{ label: "Админ", href: "/dashboard" }, { label: "Водители", href: "/drivers" }, { label: driver.id }]} />
      <AdminPageHeader title={driver.name} subtitle={`${driver.vehicle} · ${driver.plate} · ${driver.phone}`} actions={<><QuickActionModal label="Запросить документы" title="Запрос документов водителя">Водитель получит запрос на обновление документов.</QuickActionModal><QuickActionModal label="Ограничить" title="Ограничить доступ водителя" action="Ограничить">Изменения пока не сохраняются.</QuickActionModal></>} />
      <div className="admin-detail-layout">
        <AdminPanel className="p-4"><DetailGrid items={[["Статус", <Status key="s" value={driver.status} />], ["Проверка", <Status key="v" value={driver.verification} />], ["Риск", <Status key="r" value={driver.risk} />], ["Автомобиль", driver.vehicle], ["Номер", driver.plate], ["Город", driver.city], ["Рейтинг", driver.rating], ["Завершённые поездки", driver.trips], ["Отмены", driver.cancellations], ["Награды", driver.rewards]]} /></AdminPanel>
        <Tabs tabs={[
          { label: "Обзор", content: <DetailGrid items={[["Пунктуальность", "94%"], ["Прогресс цели", "ENVO Fill 7/10"], ["Текущий статус", <Status key="a" value={driver.status} />]]} /> },
          { label: "Автомобиль", content: <DetailGrid items={[["Модель", driver.vehicle], ["Номер", driver.plate], ["Документы", <Status key="d" value={driver.verification} />]]} /> },
          { label: "Поездки", content: driverTrips.map((trip) => <Row key={trip.id} href={`/trips/${trip.id}`} title={trip.route} meta={trip.status} />) },
          { label: "Бронирования", content: bookings.map((booking) => <Row key={booking.id} href={`/bookings/${booking.id}`} title={booking.id} meta={booking.status} />) },
          { label: "Рейтинг", content: <DetailGrid items={[["Средняя оценка", driver.rating], ["Последний отзыв", "Чистый автомобиль и посадка вовремя"]]} /> },
          { label: "Награды", content: rewards.filter((reward) => reward.ownerId === driver.id).map((reward) => <Row key={reward.id} href="/rewards" title={reward.source} meta={reward.status} />) },
          { label: "Рефералы", content: <DetailGrid items={[["Приглашённые водители", "2"], ["Подтверждено", "1"]]} /> },
          { label: "ENVO Fill / ENVO Return", content: <DetailGrid items={[["Спрос ENVO Fill", "6 подходящих листов ожидания"], ["Активность ENVO Return", "3 предложенных обратных маршрута"]]} /> },
          { label: "Поддержка", content: tickets.filter((ticket) => ticket.requesterId === driver.id).map((ticket) => <Row key={ticket.id} href={`/support/${ticket.id}`} title={ticket.subject} meta={ticket.status} />) },
          { label: "Антифрод", content: fraudCases.filter((item) => item.entityId === driver.id).map((item) => <Row key={item.id} href="/fraud" title={item.reason} meta={item.risk} />) },
          { label: "GPS", content: <DetailGrid items={[["Последний сигнал", "Сегодня 12:28"], ["Коридор", "Nukus → Urgench"], ["Доказательства", "Доступная трасса"]]} /> },
          { label: "Аудит", content: <DetailGrid items={[["Проверяющий", "Оператор ENVO"], ["Последнее решение", "Документы одобрены"], ["Связанная поездка", <LinkedValue key="t" href="/trips/trip_7001">trip_7001</LinkedValue>]]} /> },
        ]} />
      </div>
    </main>
  );
}

function Row({ href, title, meta }: { href: string; title: string; meta: string }) {
  return <a className="mb-2 grid grid-cols-[1fr_auto] rounded-[8px] border border-[rgb(var(--border))] p-3 text-[rgb(var(--foreground))] no-underline hover:bg-[rgb(var(--surface-muted))]" href={href}><strong>{title}</strong><Status value={meta} /></a>;
}
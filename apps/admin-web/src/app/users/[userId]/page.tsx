import { AdminPageHeader, AdminPanel } from "../../admin-shell";
import { Breadcrumbs, DetailGrid, QuickActionModal, Status, Tabs } from "../../admin-components";
import { bookings, fraudCases, referrals, rewards, tickets, trips, userById } from "../../admin-data";

export default async function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const user = userById(userId);
  return (
    <main className="admin-main">
      <Breadcrumbs items={[{ label: "Админ", href: "/dashboard" }, { label: "Клиенты", href: "/users" }, { label: user.id }]} />
      <AdminPageHeader title={user.name} subtitle={`${user.telegram} · ${user.phone}`} actions={<><QuickActionModal label="Изменить статус" title="Изменить статус клиента" action="Сохранить статус">Изменение статуса остаётся demo-действием до подключения существующего backend endpoint.</QuickActionModal><QuickActionModal label="Добавить заметку" title="Добавить заметку">Заметка сохраняется только в preview state.</QuickActionModal></>} />
      <div className="admin-detail-layout">
        <AdminPanel className="p-4">
          <div className="grid place-items-center rounded-[8px] bg-[rgb(var(--surface-tint))] p-6 text-center"><div className="grid h-16 w-16 place-items-center rounded-full bg-[rgb(var(--primary))] text-xl font-black text-[rgb(var(--primary-foreground))]">{user.name.slice(0, 1)}</div><h2 className="mb-0 mt-3 text-xl font-black">{user.name}</h2><Status value={user.risk} /></div>
          <div className="mt-4"><DetailGrid items={[["Статус", <Status key="s" value={user.status} />], ["Надёжность", user.rating], ["Поездки", user.trips], ["Отмены", user.cancellations], ["Награды", user.rewards], ["Создано", user.created]]} /></div>
        </AdminPanel>
        <Tabs tabs={[
          { label: "Обзор", content: <DetailGrid items={[["Telegram", user.telegram], ["Телефон", user.phone], ["Риск", <Status key="r" value={user.risk} />], ["Рефералы", user.referrals]]} /> },
          { label: "Поездки", content: trips.map((trip) => <Row key={trip.id} href={`/trips/${trip.id}`} title={trip.route} meta={trip.status} />) },
          { label: "Бронирования", content: bookings.filter((booking) => booking.clientId === user.id).map((booking) => <Row key={booking.id} href={`/bookings/${booking.id}`} title={booking.id} meta={booking.status} />) },
          { label: "Награды", content: rewards.filter((reward) => reward.ownerId === user.id).map((reward) => <Row key={reward.id} href="/rewards" title={reward.id} meta={reward.status} />) },
          { label: "Рефералы", content: referrals.map((referral) => <Row key={referral.id} href="/referrals" title={referral.id} meta={referral.status} />) },
          { label: "Поддержка", content: tickets.filter((ticket) => ticket.requesterId === user.id).map((ticket) => <Row key={ticket.id} href={`/support/${ticket.id}`} title={ticket.subject} meta={ticket.status} />) },
          { label: "Антифрод", content: fraudCases.map((item) => <Row key={item.id} href="/fraud" title={item.type} meta={item.risk} />) },
          { label: "GPS / История", content: <DetailGrid items={[["Последний маршрут", "Станция Nukus → центр Urgench"], ["Доступ к геолокации", "Только во время поездки"], ["Окно истории", "Preview-данные"]]} /> },
          { label: "Аудит", content: <DetailGrid items={[["Создано", user.created], ["Последняя проверка", "Сегодня 09:18"], ["Оператор", "Demo-оператор"]]} /> },
        ]} />
      </div>
    </main>
  );
}

function Row({ href, title, meta }: { href: string; title: string; meta: string }) {
  return <a className="mb-2 grid grid-cols-[1fr_auto] rounded-[8px] border border-[rgb(var(--border))] p-3 text-[rgb(var(--foreground))] no-underline hover:bg-[rgb(var(--surface-muted))]" href={href}><strong>{title}</strong><Status value={meta} /></a>;
}
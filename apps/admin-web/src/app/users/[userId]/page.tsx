import { AdminPageHeader, AdminPanel } from "../../admin-shell";
import { Breadcrumbs, DetailGrid, QuickActionModal, Status, Tabs } from "../../admin-components";
import { bookings, fraudCases, referrals, rewards, tickets, trips, userById } from "../../admin-data";

export default async function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const user = userById(userId);
  return (
    <main className="admin-main">
      <Breadcrumbs items={[{ label: "Admin", href: "/dashboard" }, { label: "Клиенты", href: "/users" }, { label: user.id }]} />
      <AdminPageHeader title={user.name} subtitle={`${user.telegram} · ${user.phone}`} actions={<><QuickActionModal label="Change status" title="Change client status" action="Save status">Status changes are disabled in preview until the backend endpoint is connected.</QuickActionModal><QuickActionModal label="Add audit note" title="Add audit note">The note is captured in preview state only.</QuickActionModal></>} />
      <div className="admin-detail-layout">
        <AdminPanel className="p-4">
          <div className="grid place-items-center rounded-[8px] bg-[rgb(var(--surface-tint))] p-6 text-center"><div className="grid h-16 w-16 place-items-center rounded-full bg-[rgb(var(--primary))] text-xl font-black text-[rgb(var(--primary-foreground))]">{user.name.slice(0, 1)}</div><h2 className="mb-0 mt-3 text-xl font-black">{user.name}</h2><Status value={user.risk} /></div>
          <div className="mt-4"><DetailGrid items={[["Status", <Status key="s" value={user.status} />], ["Reliability", user.rating], ["Trips", user.trips], ["Cancellations", user.cancellations], ["Rewards", user.rewards], ["Created", user.created]]} /></div>
        </AdminPanel>
        <Tabs tabs={[
          { label: "Overview", content: <DetailGrid items={[["Telegram", user.telegram], ["Phone", user.phone], ["Risk", <Status key="r" value={user.risk} />], ["Referrals", user.referrals]]} /> },
          { label: "Trips", content: trips.map((trip) => <Row key={trip.id} href={`/trips/${trip.id}`} title={trip.route} meta={trip.status} />) },
          { label: "Bookings", content: bookings.filter((booking) => booking.clientId === user.id).map((booking) => <Row key={booking.id} href={`/bookings/${booking.id}`} title={booking.id} meta={booking.status} />) },
          { label: "Rewards", content: rewards.filter((reward) => reward.ownerId === user.id).map((reward) => <Row key={reward.id} href="/rewards" title={reward.id} meta={reward.status} />) },
          { label: "Referrals", content: referrals.map((referral) => <Row key={referral.id} href="/referrals" title={referral.id} meta={referral.status} />) },
          { label: "Support", content: tickets.filter((ticket) => ticket.requesterId === user.id).map((ticket) => <Row key={ticket.id} href={`/support/${ticket.id}`} title={ticket.subject} meta={ticket.status} />) },
          { label: "Fraud", content: fraudCases.map((item) => <Row key={item.id} href="/fraud" title={item.type} meta={item.risk} />) },
          { label: "GPS / History", content: <DetailGrid items={[["Last known route", "Nukus station -> Urgench center"], ["Location consent", "Trip only"], ["History window", "Preview data"]]} /> },
          { label: "Audit", content: <DetailGrid items={[["Created", user.created], ["Last review", "Today 09:18"], ["Operator", "Admin Mock"]]} /> },
        ]} />
      </div>
    </main>
  );
}

function Row({ href, title, meta }: { href: string; title: string; meta: string }) {
  return <a className="mb-2 grid grid-cols-[1fr_auto] rounded-[8px] border border-[rgb(var(--border))] p-3 text-[rgb(var(--foreground))] no-underline hover:bg-[rgb(var(--surface-muted))]" href={href}><strong>{title}</strong><Status value={meta} /></a>;
}
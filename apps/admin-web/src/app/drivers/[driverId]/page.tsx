import { AdminPageHeader, AdminPanel } from "../../admin-shell";
import { Breadcrumbs, DetailGrid, LinkedValue, QuickActionModal, Status, Tabs } from "../../admin-components";
import { bookings, driverById, fraudCases, rewards, tickets, trips } from "../../admin-data";

export default async function DriverDetailPage({ params }: { params: Promise<{ driverId: string }> }) {
  const { driverId } = await params;
  const driver = driverById(driverId);
  const driverTrips = trips.filter((trip) => trip.driverId === driver.id);
  return (
    <main className="admin-main">
      <Breadcrumbs items={[{ label: "Admin", href: "/dashboard" }, { label: "Водители", href: "/drivers" }, { label: driver.id }]} />
      <AdminPageHeader title={driver.name} subtitle={`${driver.vehicle} · ${driver.plate} · ${driver.phone}`} actions={<><QuickActionModal label="Request docs" title="Request driver document update">This sends a driver verification follow-up when API actions are connected.</QuickActionModal><QuickActionModal label="Restrict" title="Restrict driver access" action="Hold in preview">Restriction is disabled in preview unless an existing backend action is attached.</QuickActionModal></>} />
      <div className="admin-detail-layout">
        <AdminPanel className="p-4"><DetailGrid items={[["Status", <Status key="s" value={driver.status} />], ["Verification", <Status key="v" value={driver.verification} />], ["Risk", <Status key="r" value={driver.risk} />], ["Vehicle", driver.vehicle], ["Plate", driver.plate], ["City", driver.city], ["Rating", driver.rating], ["Completed trips", driver.trips], ["Cancellations", driver.cancellations], ["Rewards", driver.rewards]]} /></AdminPanel>
        <Tabs tabs={[
          { label: "Overview", content: <DetailGrid items={[["Punctuality", "94%"], ["Milestone progress", "Fill 7/10"], ["Active status", <Status key="a" value={driver.status} />]]} /> },
          { label: "Vehicle", content: <DetailGrid items={[["Model", driver.vehicle], ["Plate", driver.plate], ["Documents", <Status key="d" value={driver.verification} />]]} /> },
          { label: "Trips", content: driverTrips.map((trip) => <Row key={trip.id} href={`/trips/${trip.id}`} title={trip.route} meta={trip.status} />) },
          { label: "Bookings", content: bookings.map((booking) => <Row key={booking.id} href={`/bookings/${booking.id}`} title={booking.id} meta={booking.status} />) },
          { label: "Ratings", content: <DetailGrid items={[["Average", driver.rating], ["Recent review", "Clean car and on-time pickup"]]} /> },
          { label: "Rewards", content: rewards.filter((reward) => reward.ownerId === driver.id).map((reward) => <Row key={reward.id} href="/rewards" title={reward.source} meta={reward.status} />) },
          { label: "Referrals", content: <DetailGrid items={[["Invited drivers", "2"], ["Qualified", "1"]]} /> },
          { label: "Fill / Return", content: <DetailGrid items={[["Fill demand", "6 matched waitlists"], ["Return activity", "3 return routes offered"]]} /> },
          { label: "Support", content: tickets.filter((ticket) => ticket.requesterId === driver.id).map((ticket) => <Row key={ticket.id} href={`/support/${ticket.id}`} title={ticket.subject} meta={ticket.status} />) },
          { label: "Fraud", content: fraudCases.filter((item) => item.entityId === driver.id).map((item) => <Row key={item.id} href="/fraud" title={item.reason} meta={item.risk} />) },
          { label: "GPS", content: <DetailGrid items={[["Last ping", "Today 12:28"], ["Corridor", "Nukus -> Urgench"], ["Evidence", "Preview trace"]]} /> },
          { label: "Audit", content: <DetailGrid items={[["Reviewer", "Admin Mock"], ["Last decision", "Docs accepted"], ["Related trip", <LinkedValue key="t" href="/trips/trip_7001">trip_7001</LinkedValue>]]} /> },
        ]} />
      </div>
    </main>
  );
}

function Row({ href, title, meta }: { href: string; title: string; meta: string }) {
  return <a className="mb-2 grid grid-cols-[1fr_auto] rounded-[8px] border border-[rgb(var(--border))] p-3 text-[rgb(var(--foreground))] no-underline hover:bg-[rgb(var(--surface-muted))]" href={href}><strong>{title}</strong><Status value={meta} /></a>;
}
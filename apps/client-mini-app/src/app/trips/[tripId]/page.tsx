import Link from "next/link";
import { VehicleImage, formatUzs } from "@nodex/ui";
import { AvoidDriverPanel } from "./avoid-driver-panel";
import { Avatar, Card, ClientHeader, ClientShell, Icon, StatusPill } from "../../client-ui";

const tripDetails = {
  "phase5-nukus-urgench-morning": { origin: "Nukus", destination: "Urgench", departure: "08:30", arrival: "11:30", duration: "3 часа", priceMinor: 8500000, seats: 4, driver: "Azizbek Karimov", rating: "4.9", completedTrips: "268 поездок", reliability: "96%", vehicle: "Chevrolet Cobalt", color: "Белый", plate: "95 A 214 QA", capacity: "4 места", note: "Можно взять одну среднюю сумку. Небольшие посылки водитель принимает по согласованию." },
  "phase5-nukus-urgench-evening": { origin: "Nukus", destination: "Urgench", departure: "18:10", arrival: "21:05", duration: "2 часа 55 минут", priceMinor: 9200000, seats: 2, driver: "Madina Yusupova", rating: "4.8", completedTrips: "142 поездки", reliability: "91%", vehicle: "Chevrolet Tracker", color: "Серебристый", plate: "95 B 782 LA", capacity: "4 места", note: "Вечерняя поездка с местом для багажа. Посылки в этой поездке не принимаются." },
  "phase5-nukus-khiva": { origin: "Nukus", destination: "Khiva", departure: "09:00", arrival: "12:30", duration: "3 часа 30 минут", priceMinor: 9500000, seats: 1, driver: "Sherzod Rakhimov", rating: "4.7", completedTrips: "94 поездки", reliability: "94%", vehicle: "BYD Chazor", color: "Синий", plate: "90 C 414 HA", capacity: "4 места", note: "Почти полный рейс. Одна средняя сумка включена." },
};

export default async function PublicTripPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const trip = tripDetails[tripId as keyof typeof tripDetails] ?? tripDetails["phase5-nukus-urgench-morning"];

  return (
    <ClientShell active="trips">
      <ClientHeader backHref="/search" level="secondary" title="Детали поездки" subtitle={`${trip.origin} → ${trip.destination}`} action={<Link aria-label="Поделиться" className="grid h-10 w-10 place-items-center rounded-full bg-[rgb(var(--surface))] text-[rgb(var(--primary))] shadow-[var(--shadow-xs)]" href={`/safety/sos?tripId=${tripId}&share=1`}><Icon name="shield" /></Link>} />

      <section className="mt-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3"><div><div className="text-3xl font-semibold">{trip.departure}</div><div className="mt-1 text-sm text-[rgb(var(--text-muted))]">{trip.origin}</div></div><div className="text-center text-sm text-[rgb(var(--text-muted))]">→<br />{trip.duration}</div><div className="text-right"><div className="text-3xl font-semibold">{trip.arrival}</div><div className="mt-1 text-sm text-[rgb(var(--text-muted))]">{trip.destination}</div></div></div>
      </section>

      <Card className="mt-6" compact>
        <div className="grid grid-cols-2 gap-3"><div><p className="m-0 text-sm text-[rgb(var(--text-muted))]">Цена за место</p><div className="mt-1 text-2xl font-semibold">{formatUzs(trip.priceMinor)}</div></div><div className="text-right"><p className="m-0 text-sm text-[rgb(var(--text-muted))]">Свободно</p><div className="mt-1 text-2xl font-semibold">{trip.seats} места</div></div></div>
      </Card>

      <Card className="mt-4" compact>
        <div className="flex items-center gap-3"><Avatar name={trip.driver} /><div className="min-w-0 flex-1"><h2 className="m-0 truncate text-lg font-semibold">{trip.driver}</h2><p className="m-0 mt-1 text-sm text-[rgb(var(--text-muted))]">★ {trip.rating} · {trip.completedTrips}</p></div><StatusPill tone="success">Надёжность {trip.reliability}</StatusPill></div>
        <AvoidDriverPanel driver={trip.driver} vehicle={trip.vehicle} plate={trip.plate} />
      </Card>

      <Card className="mt-4" compact>
        <VehicleImage alt={trip.vehicle} className="rounded-[20px]" />
        <div className="mt-3 flex items-start justify-between gap-3"><div><h2 className="m-0 text-lg font-semibold">{trip.vehicle}</h2><p className="m-0 mt-1 text-sm text-[rgb(var(--text-muted))]">{trip.color} · {trip.capacity}</p></div><span className="rounded-full bg-[rgb(var(--canvas))] px-3 py-2 text-sm font-semibold">{trip.plate}</span></div>
      </Card>

      <Card className="mt-4" compact>
        <h2 className="m-0 text-lg font-semibold">Условия</h2>
        <p className="m-0 mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">{trip.note}</p>
        <div className="mt-3 flex gap-2"><Link className="flex min-h-10 flex-1 items-center justify-center rounded-[16px] bg-[rgb(var(--canvas))] px-3 text-sm font-semibold text-[rgb(var(--foreground))] no-underline" href={`/messages/driver-azizbek?tripId=${tripId}`}>Написать</Link><Link className="flex min-h-10 flex-1 items-center justify-center rounded-[16px] bg-[rgb(var(--canvas))] px-3 text-sm font-semibold text-[rgb(var(--foreground))] no-underline" href={`/safety?tripId=${tripId}`}>Безопасность</Link></div>
      </Card>

      <section className="sticky bottom-[76px] mt-5 rounded-[22px] bg-[rgb(var(--surface)/0.98)] p-3 shadow-[var(--shadow-floating)] backdrop-blur">
        <div className="mb-3 flex items-center justify-between text-sm"><span className="text-[rgb(var(--text-muted))]">ENVO Protection</span><span className="font-semibold text-[rgb(var(--primary))]">Поездка защищена</span></div>
        <Link className="flex min-h-12 w-full items-center justify-center rounded-[18px] bg-[rgb(var(--primary))] px-4 text-base font-semibold text-[rgb(var(--primary-foreground))] no-underline" href={`/trips/${tripId}/book`}>Выбрать места</Link>
      </section>
    </ClientShell>
  );
}
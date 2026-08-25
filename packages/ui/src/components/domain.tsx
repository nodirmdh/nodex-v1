import { ArrowRight, Car, Clock, Luggage, MapPin, ShieldCheck, Star } from "lucide-react";
import { Badge, Button, Panel, cn } from "./core";

export interface TripCardProps {
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  duration: string;
  driver: string;
  rating: number;
  reliability: number;
  car: string;
  amenities: string[];
  seatsLeft: number;
  priceMinor: number;
}

export function formatUzs(minor: number) {
  return new Intl.NumberFormat("ru-UZ").format(Math.round(minor / 100)) + " UZS";
}

export function TripCard(props: TripCardProps) {
  return (
    <Panel className="p-0">
      <div className="flex items-start justify-between gap-3 border-b border-[rgb(var(--border))] p-4">
        <div>
          <div className="flex items-center gap-2 text-xl font-bold">
            <span>{props.departure}</span>
            <ArrowRight size={18} />
            <span>{props.arrival}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm text-[rgb(var(--text-muted))]">
            <MapPin size={14} />
            {props.origin} to {props.destination}
          </div>
        </div>
        <Badge tone="success">{props.seatsLeft} seats</Badge>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          <Badge tone="info">
            <Clock size={13} /> {props.duration}
          </Badge>
          <Badge>
            <Car size={13} /> {props.car}
          </Badge>
          <Badge tone="success">
            <ShieldCheck size={13} /> {props.reliability}%
          </Badge>
          <Badge tone="warning">
            <Star size={13} /> {props.rating}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {props.amenities.map((amenity) => (
            <span key={amenity} className="text-xs text-[rgb(var(--text-muted))]">
              {amenity}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-[rgb(var(--text-muted))]">from</div>
            <div className="text-lg font-bold">{formatUzs(props.priceMinor)}</div>
          </div>
          <Button>Choose</Button>
        </div>
      </div>
    </Panel>
  );
}

export function RouteSearch() {
  return (
    <Panel className="space-y-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-[rgb(var(--text-muted))]">From</span>
          <input
            className="rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3 py-2"
            defaultValue="Nukus"
          />
        </label>
        <Button aria-label="Swap route" variant="secondary" className="mt-5 px-3">
          <ArrowRight size={16} />
        </Button>
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-[rgb(var(--text-muted))]">To</span>
          <input
            className="rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3 py-2"
            defaultValue="Urgench"
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-[rgb(var(--text-muted))]">Date</span>
          <input
            className="rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3 py-2"
            defaultValue="Tomorrow"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-[rgb(var(--text-muted))]">Passengers</span>
          <input
            className="rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3 py-2"
            defaultValue="2"
          />
        </label>
      </div>
      <Button className="w-full">Search trips</Button>
    </Panel>
  );
}

export function SeatMap({ compact = false }: { compact?: boolean }) {
  const seats = ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"];
  return (
    <div className={cn("grid grid-cols-2 gap-2", compact ? "max-w-32" : "max-w-52")}>
      {seats.map((seat, index) => (
        <button
          key={seat}
          className={cn(
            "aspect-[1.25] rounded-[var(--radius-md)] border text-xs font-bold",
            index === 1 || index === 5
              ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.14)] text-[rgb(var(--primary))]"
              : "border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))]",
          )}
        >
          {seat}
        </button>
      ))}
    </div>
  );
}

export function Timeline({
  items,
}: {
  items: Array<{ label: string; time: string; active?: boolean }>;
}) {
  return (
    <ol className="space-y-3">
      {items.map((item) => (
        <li key={item.label} className="flex gap-3">
          <span
            className={cn(
              "mt-1 h-3 w-3 rounded-full",
              item.active ? "bg-[rgb(var(--primary))]" : "bg-[rgb(var(--border))]",
            )}
          />
          <span>
            <span className="block text-sm font-semibold">{item.label}</span>
            <span className="text-xs text-[rgb(var(--text-muted))]">{item.time}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function PriceBreakdown() {
  return (
    <Panel className="space-y-2">
      {[
        ["2 seats", "170 000 UZS"],
        ["Service fee", "8 000 UZS"],
        ["Total", "178 000 UZS"],
      ].map(([label, value], index) => (
        <div
          key={label}
          className={cn("flex justify-between text-sm", index === 2 && "pt-2 text-base font-bold")}
        >
          <span>{label}</span>
          <span>{value}</span>
        </div>
      ))}
    </Panel>
  );
}

export function AppHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="flex items-center justify-between gap-3 px-4 py-4">
      <div>
        <div className="text-lg font-black tracking-normal">{title}</div>
        <div className="text-xs text-[rgb(var(--text-muted))]">{subtitle}</div>
      </div>
      <div className="flex items-center gap-2">
        <select
          aria-label="Language"
          className="rounded-full border border-[rgb(var(--border))] bg-transparent px-2 py-1 text-xs"
        >
          <option>RU</option>
          <option>UZ</option>
          <option>KAA</option>
        </select>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-[rgb(var(--primary))] text-sm font-bold text-[rgb(var(--primary-foreground))]">
          N
        </div>
      </div>
    </header>
  );
}

export function BottomNav({ items }: { items: Array<{ label: string; active?: boolean }> }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[var(--z-nav)] mx-auto max-w-md border-t border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.95)] px-2 py-2 backdrop-blur">
      <div className="grid grid-cols-4 gap-1">
        {items.map((item) => (
          <button
            key={item.label}
            className={cn(
              "rounded-[var(--radius-md)] px-2 py-2 text-xs font-semibold",
              item.active && "bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))]",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

export function DriverSummary() {
  return (
    <Panel className="flex items-center justify-between">
      <div>
        <div className="text-sm text-[rgb(var(--text-muted))]">Nearest trip</div>
        <div className="text-lg font-bold">Nukus to Khiva</div>
        <div className="text-xs text-[rgb(var(--text-muted))]">Today, 16:40</div>
      </div>
      <div className="text-right">
        <div className="text-2xl font-black">6/8</div>
        <div className="text-xs text-[rgb(var(--text-muted))]">occupied</div>
      </div>
    </Panel>
  );
}

export function VehicleSummary() {
  return (
    <Panel className="flex items-center gap-3">
      <div className="grid h-12 w-12 place-items-center rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))]">
        <Car size={22} />
      </div>
      <div>
        <div className="font-bold">Chevrolet Cobalt</div>
        <div className="text-sm text-[rgb(var(--text-muted))]">White, 2022, 4 seats</div>
      </div>
      <Luggage className="ml-auto text-[rgb(var(--text-subtle))]" size={18} />
    </Panel>
  );
}

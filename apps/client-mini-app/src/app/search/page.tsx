"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader, Badge, BottomNav, Button, EmptyState, Panel, formatUzs } from "@nodex/ui";

const cities = [
  { id: "nukus", name: "Nukus" },
  { id: "urgench", name: "Urgench" },
  { id: "khiva", name: "Khiva" },
  { id: "bukhara", name: "Bukhara" },
];

const trips = [
  {
    id: "phase5-nukus-urgench-morning",
    origin: "Nukus",
    destination: "Urgench",
    date: "2026-08-08",
    departure: "08:30",
    arrival: "11:30",
    seats: 4,
    priceMinor: 8500000,
    bodyType: "SEDAN",
    parcel: true,
    luggage: true,
    driver: "Phase Driver",
    vehicle: "Chevrolet Tracker",
  },
  {
    id: "phase5-nukus-urgench-evening",
    origin: "Nukus",
    destination: "Urgench",
    date: "2026-08-08",
    departure: "18:10",
    arrival: "21:05",
    seats: 2,
    priceMinor: 9200000,
    bodyType: "SEDAN",
    parcel: false,
    luggage: true,
    driver: "Verified driver",
    vehicle: "Chevrolet Cobalt",
  },
  {
    id: "phase5-nukus-khiva",
    origin: "Nukus",
    destination: "Khiva",
    date: "2026-08-10",
    departure: "09:00",
    arrival: "12:30",
    seats: 3,
    priceMinor: 9500000,
    bodyType: "CROSSOVER",
    parcel: true,
    luggage: true,
    driver: "Route partner",
    vehicle: "BYD Chazor",
  },
];

type SearchState = {
  from: string;
  to: string;
  date: string;
  passengers: number;
  sort: "departure_asc" | "price_asc" | "price_desc";
  parcel: boolean;
  luggage: boolean;
};

const defaultState: SearchState = {
  from: "Nukus",
  to: "Urgench",
  date: "2026-08-08",
  passengers: 2,
  sort: "departure_asc",
  parcel: false,
  luggage: false,
};

export default function SearchPage() {
  const [state, setState] = useState<SearchState>(defaultState);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setState({
      from: params.get("from") ?? defaultState.from,
      to: params.get("to") ?? defaultState.to,
      date: params.get("date") ?? defaultState.date,
      passengers: Number(params.get("passengers") ?? defaultState.passengers),
      sort: (params.get("sort") as SearchState["sort"]) ?? defaultState.sort,
      parcel: params.get("parcel") === "true",
      luggage: params.get("luggage") === "true",
    });
    setRecent(JSON.parse(localStorage.getItem("nodex.recentSearches") ?? "[]") as string[]);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({
      from: state.from,
      to: state.to,
      date: state.date,
      passengers: String(state.passengers),
      sort: state.sort,
    });
    if (state.parcel) params.set("parcel", "true");
    if (state.luggage) params.set("luggage", "true");
    window.history.replaceState(null, "", `/search?${params.toString()}`);
  }, [state]);

  const results = useMemo(() => {
    const filtered = trips.filter(
      (trip) =>
        trip.origin === state.from &&
        trip.destination === state.to &&
        trip.date === state.date &&
        trip.seats >= state.passengers &&
        (!state.parcel || trip.parcel) &&
        (!state.luggage || trip.luggage),
    );
    const sorted = [...filtered].sort((left, right) => {
      const stable =
        left.departure.localeCompare(right.departure) || left.id.localeCompare(right.id);
      if (state.sort === "price_asc") return left.priceMinor - right.priceMinor || stable;
      if (state.sort === "price_desc") return right.priceMinor - left.priceMinor || stable;
      return stable;
    });
    return sorted;
  }, [state]);

  function submitSearch() {
    const label = `${state.from} to ${state.to}, ${state.date}`;
    const next = [label, ...recent.filter((item) => item !== label)].slice(0, 4);
    setRecent(next);
    localStorage.setItem("nodex.recentSearches", JSON.stringify(next));
  }

  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="Search" subtitle="Find a reliable route" />
      <div className="space-y-4 px-4">
        <Panel>
          <form
            aria-label="Trip search form"
            className="space-y-3"
            onSubmit={(event) => event.preventDefault()}
          >
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-500">From</span>
                <select
                  className="rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3 py-2"
                  value={state.from}
                  onChange={(event) => setState({ ...state, from: event.target.value })}
                >
                  {cities.map((city) => (
                    <option key={city.id}>{city.name}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-500">To</span>
                <select
                  className="rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3 py-2"
                  value={state.to}
                  onChange={(event) => setState({ ...state, to: event.target.value })}
                >
                  {cities.map((city) => (
                    <option key={city.id}>{city.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-500">Date</span>
                <input
                  className="rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3 py-2"
                  type="date"
                  value={state.date}
                  onChange={(event) => setState({ ...state, date: event.target.value })}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-500">Passengers</span>
                <input
                  className="rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3 py-2"
                  min={1}
                  max={8}
                  type="number"
                  value={state.passengers}
                  onChange={(event) =>
                    setState({ ...state, passengers: Number(event.target.value) })
                  }
                />
              </label>
            </div>
            <Button className="w-full" onClick={submitSearch}>
              Search trips
            </Button>
          </form>
        </Panel>

        <section aria-label="Trip filters" className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-sm font-bold">Filters</h2>
            <select
              aria-label="Sort trips"
              className="rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-2 py-1 text-xs"
              value={state.sort}
              onChange={(event) =>
                setState({ ...state, sort: event.target.value as SearchState["sort"] })
              }
            >
              <option value="departure_asc">Earliest</option>
              <option value="price_asc">Lowest price</option>
              <option value="price_desc">Highest price</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <label>
              <input
                checked={state.parcel}
                className="mr-1"
                type="checkbox"
                onChange={(event) => setState({ ...state, parcel: event.target.checked })}
              />
              Parcel
            </label>
            <label>
              <input
                checked={state.luggage}
                className="mr-1"
                type="checkbox"
                onChange={(event) => setState({ ...state, luggage: event.target.checked })}
              />
              Luggage
            </label>
          </div>
        </section>

        <section aria-label="Search results" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-sm font-bold">Available trips</h2>
            <Badge tone="info">{results.length} found</Badge>
          </div>
          {results.map((trip) => (
            <Panel key={trip.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="m-0 text-base font-bold">
                    {trip.origin} to {trip.destination}
                  </h3>
                  <p className="m-0 text-sm text-slate-500">
                    {trip.departure} - {trip.arrival} · {trip.vehicle}
                  </p>
                </div>
                <Badge tone="success">{trip.seats} seats</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{trip.bodyType}</Badge>
                {trip.parcel ? <Badge tone="info">Parcel</Badge> : null}
                {trip.luggage ? <Badge tone="success">Luggage</Badge> : null}
              </div>
              <div className="flex items-center justify-between">
                <strong>{formatUzs(trip.priceMinor)}</strong>
                <Link
                  className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] bg-[rgb(var(--primary))] px-4 text-sm font-semibold text-[rgb(var(--primary-foreground))]"
                  href={`/trips/${trip.id}`}
                >
                  View {trip.departure}
                </Link>
              </div>
            </Panel>
          ))}
          {results.length === 0 ? (
            <EmptyState
              title="No trips found"
              body="Try another date, passenger count, or route."
            />
          ) : null}
        </section>

        {recent.length > 0 ? (
          <section aria-label="Recent searches" className="space-y-2">
            <h2 className="m-0 text-sm font-bold">Recent searches</h2>
            <div className="flex flex-wrap gap-2">
              {recent.map((item) => (
                <Badge key={item}>{item}</Badge>
              ))}
            </div>
          </section>
        ) : null}
      </div>
      <BottomNav
        items={[
          { label: "Home" },
          { label: "Search", active: true },
          { label: "Trip" },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}

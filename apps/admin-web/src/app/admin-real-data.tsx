"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@nodex/ui";
import {
  getAdminSupportTicket,
  getAdminTrip,
  getAdminTripHistory,
  getAdminTripOperations,
  listAdminSupportTickets,
  listAdminTrips,
  type AdminSupportTicket,
  type AdminTrip,
  type AdminTripHistoryResponse,
  type AdminTripOperationsResponse,
} from "@nodex/api-client";
import { AdminPanel } from "./admin-shell";
import { DataTable, DetailGrid, LinkedValue, Status, Tabs, Toolbar } from "./admin-components";

const tokenKey = "nodex.admin.accessToken";
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000/api/v1";

type LoadState<T> = { status: "idle" | "loading" | "loaded" | "error"; data: T | null; error: string | null };

function useAdminAccessToken() {
  const [accessToken, setAccessToken] = useState("");
  const [status, setStatus] = useState("Admin session required");

  useEffect(() => {
    const saved = window.localStorage.getItem(tokenKey) ?? "";
    if (saved) {
      setAccessToken(saved);
      setStatus("Admin session restored");
    }
  }, []);

  const login = useCallback(async () => {
    const response = await fetch(`${apiBase}/auth/mock`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ appContext: "ADMIN_WEB" }),
    });
    if (!response.ok) throw new Error("Admin mock login failed");
    const body = await response.json();
    window.localStorage.setItem(tokenKey, body.accessToken);
    setAccessToken(body.accessToken);
    setStatus(`Signed in as ${body.user?.displayName ?? "admin"}`);
    return body.accessToken as string;
  }, []);

  return { accessToken, login, status };
}

function authOptions(accessToken: string): RequestInit {
  return { credentials: "include", headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {} };
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function userName(user?: { displayName?: string | null; username?: string | null; id?: string } | null) {
  return user?.displayName ?? user?.username ?? user?.id ?? "Не назначен";
}

function cityName(city?: { nameRu?: string | null; nameUz?: string | null; nameKaa?: string | null; code?: string | null } | null) {
  return city?.nameRu ?? city?.nameUz ?? city?.nameKaa ?? city?.code ?? "-";
}

function routeName(trip: AdminTrip) {
  const origin = cityName(trip.route?.originCity ?? trip.origin);
  const destination = cityName(trip.route?.destinationCity ?? trip.destination);
  return `${origin} → ${destination}`;
}

function vehicleName(trip: AdminTrip) {
  const vehicle = trip.vehicle ?? {};
  return [vehicle.make, vehicle.model, vehicle.plateNumber].filter(Boolean).join(" ") || "-";
}

function EmptyPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return <AdminPanel className="p-5"><h2 className="m-0 text-base font-black">{title}</h2><div className="mt-2 text-sm text-[rgb(var(--text-muted))]">{children}</div></AdminPanel>;
}

const demoTrips = [
  { id: "trip_7001", route: "Nukus → Urgench", driver: "Azizbek Karimov", departure: "24 авг, 08:30", status: "BOARDING", seats: "3/4", vehicle: "Chevrolet Cobalt · 95 A 214 QA", eta: "11:30" },
  { id: "trip_7002", route: "Nukus → Khiva", driver: "Madina Yusupova", departure: "24 авг, 09:00", status: "BOOKING_OPEN", seats: "2/4", vehicle: "Chevrolet Tracker · 95 B 412 QA", eta: "12:10" },
];

const demoTickets = [
  { id: "sup_demo_1", requester: "Gulnoza Bektemirova", subject: "Уточнить точку посадки", type: "BOOKING_ISSUE", priority: "HIGH", status: "OPEN", tripId: "trip_7001" },
  { id: "sup_demo_2", requester: "Azizbek Karimov", subject: "Клиент опаздывает", type: "SUPPORT", priority: "NORMAL", status: "IN_PROGRESS", tripId: "trip_7002" },
];

function ApiFallbackNotice({ children }: { children: React.ReactNode }) {
  return <div className="border-b border-[rgb(var(--border))] bg-[rgb(var(--info-soft))] px-4 py-3 text-sm font-semibold text-[rgb(var(--info))]">{children}</div>;
}

function DemoTripsList({ note }: { note: string }) {
  return <AdminPanel className="overflow-hidden"><ApiFallbackNotice>{note}</ApiFallbackNotice><DataTable rows={demoTrips} hrefFor={(row) => "/trips/" + row.id} columns={[{ key: "route", label: "Маршрут", render: (row) => <strong>{row.route}</strong> }, { key: "driver", label: "Водитель", render: (row) => row.driver }, { key: "departure", label: "Выезд", render: (row) => row.departure }, { key: "status", label: "Статус", render: (row) => <Status value={row.status} /> }, { key: "seats", label: "Места", render: (row) => row.seats }, { key: "vehicle", label: "Авто", render: (row) => row.vehicle }, { key: "eta", label: "ETA", render: (row) => row.eta }]} /></AdminPanel>;
}

function DemoSupportInbox({ note }: { note: string }) {
  return <AdminPanel className="overflow-hidden"><ApiFallbackNotice>{note}</ApiFallbackNotice><div className="divide-y divide-[rgb(var(--border))]">{demoTickets.map((ticket) => <Link key={ticket.id} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3 text-[rgb(var(--foreground))] no-underline hover:bg-[rgb(var(--surface-muted))]" href={"/support/" + ticket.id}><span><strong className="block">{ticket.subject}</strong><span className="text-sm text-[rgb(var(--text-muted))]">{ticket.requester} · {ticket.id} · {ticket.tripId}</span></span><span className="flex gap-2"><Status value={ticket.priority} /><Status value={ticket.status} /></span></Link>)}</div></AdminPanel>;
}

function DemoSupportDetail({ ticketId, note }: { ticketId: string; note: string }) {
  const ticket = demoTickets.find((item) => item.id === ticketId) ?? demoTickets[0]!;
  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]"><AdminPanel className="overflow-hidden"><ApiFallbackNotice>{note}</ApiFallbackNotice><div className="space-y-3 p-4"><Message who={ticket.requester} text="Водитель просит уточнить точку посадки перед выездом." meta="08:30" attachments={[]} /><Message who="Оператор ENVO" text="Заметка добавлена к поездке. Водитель получил контекст." meta="08:34" attachments={[{ id: "demo-file", originalFileName: "pickup-note.jpg", mimeType: "image/jpeg", sizeBytes: 128000, status: "READY" }]} /></div></AdminPanel><AdminPanel className="p-4"><h2 className="m-0 mb-3 text-base font-black">Контекст заявки</h2><DetailGrid items={[["Клиент", ticket.requester], ["Поездка", <LinkedValue key="t" href={"/trips/" + ticket.tripId}>{ticket.tripId}</LinkedValue>], ["Тип", ticket.type], ["Статус", <Status key="s" value={ticket.status} />], ["Приоритет", <Status key="p" value={ticket.priority} />], ["SLA", "Сегодня, 10:00"], ["Файлы", "1 файл"]]} /></AdminPanel></div>;
}

function DemoTripDetail({ tripId, note }: { tripId: string; note: string }) {
  const trip = demoTrips.find((item) => item.id === tripId) ?? demoTrips[0]!;
  return <div className="admin-detail-layout"><AdminPanel className="overflow-hidden"><ApiFallbackNotice>{note}</ApiFallbackNotice><div className="p-4"><DetailGrid items={[["Водитель", trip.driver], ["Автомобиль", trip.vehicle], ["Статус", <Status key="s" value={trip.status} />], ["Выезд", trip.departure], ["Места", trip.seats], ["Start PIN", <Status key="p" value="Present" />], ["ETA", trip.eta], ["Надёжность", "94%"]]} /></div></AdminPanel><Tabs tabs={[{ label: "Пассажиры", content: <Row href="/bookings/book_5001" title="Gulnoza Bektemirova" meta="BOARDING" /> }, { label: "История", content: <EventList items={[{ type: "Создана", createdAt: "2026-08-24T07:30:00Z" }, { type: "Посадка началась", createdAt: "2026-08-24T08:20:00Z" }]} /> }, { label: "Поддержка", content: <Link className="font-black text-[rgb(var(--primary))] no-underline hover:underline" href={"/support?tripId=" + trip.id}>Открыть обращения по поездке</Link> }]} /></div>;
}

export function SupportInboxRealData() {
  const { accessToken, login, status } = useAdminAccessToken();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All priorities");
  const [state, setState] = useState<LoadState<AdminSupportTicket[]>>({ status: "idle", data: null, error: null });

  const loadTickets = useCallback(async (token = accessToken) => {
    if (!token) return;
    setState({ status: "loading", data: null, error: null });
    try {
      const body = await listAdminSupportTickets(authOptions(token));
      setState({ status: "loaded", data: body.tickets, error: null });
    } catch (error) {
      setState({ status: "error", data: null, error: error instanceof Error ? error.message : "Support API request failed" });
    }
  }, [accessToken]);

  useEffect(() => { void loadTickets(); }, [loadTickets]);

  const rows = useMemo(() => (state.data ?? []).filter((ticket) => {
    const text = `${ticket.id} ${ticket.subject} ${ticket.type} ${ticket.status} ${ticket.priority} ${userName(ticket.requester)}`.toLowerCase();
    const matchesQuery = text.includes(query.toLowerCase());
    const matchesFilter = filter === "All priorities" || ticket.priority === filter || ticket.type === filter || ticket.status === filter;
    return matchesQuery && matchesFilter;
  }), [filter, query, state.data]);

  if (!accessToken) {
    return <DemoSupportInbox note="Live API не подключён в preview. Показан стабильный demo inbox." />;
  }

  return <AdminPanel className="overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgb(var(--border))] p-3"><Status value={status} /><Button onClick={() => loadTickets()} variant="secondary">Refresh</Button></div><Toolbar query={query} onQuery={setQuery} filters={["All priorities", "URGENT", "HIGH", "NORMAL", "LOW", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "BOOKING_ISSUE", "SAFETY", "REWARDS", "COMPLAINT"]} activeFilter={filter} onFilter={setFilter} placeholder="Заявка, клиент, тип, статус" count={rows.length} />{state.status === "loading" ? <div className="p-6 text-sm font-semibold text-[rgb(var(--text-muted))]">Загружаем обращения...</div> : null}{state.status === "error" ? <DemoSupportInbox note={`Live API временно недоступен: ${state.error}. Показан demo fallback.`} /> : null}{state.status === "loaded" ? <DataTable rows={rows} hrefFor={(row) => `/support/${row.id}`} empty="API не вернул обращения." columns={[{ key: "id", label: "Заявка", render: (row) => <strong>{row.id}</strong> }, { key: "requester", label: "Клиент", render: (row) => userName(row.requester) }, { key: "subject", label: "Тема", render: (row) => row.subject }, { key: "type", label: "Тип", render: (row) => row.type }, { key: "priority", label: "Приоритет", render: (row) => <Status value={row.priority} /> }, { key: "status", label: "Статус", render: (row) => <Status value={row.status} /> }, { key: "trip", label: "Поездка", render: (row) => row.tripId ?? "-" }, { key: "updated", label: "Обновлено", sortValue: (row) => row.updatedAt, render: (row) => formatDate(row.updatedAt) }]} /> : null}</AdminPanel>;
}

export function SupportTicketRealData({ ticketId }: { ticketId: string }) {
  const { accessToken, login } = useAdminAccessToken();
  const [state, setState] = useState<LoadState<AdminSupportTicket>>({ status: "idle", data: null, error: null });
  const loadTicket = useCallback(async (token = accessToken) => {
    if (!token) return;
    setState({ status: "loading", data: null, error: null });
    try {
      const body = await getAdminSupportTicket(ticketId, authOptions(token));
      setState({ status: "loaded", data: body.ticket, error: null });
    } catch (error) {
      setState({ status: "error", data: null, error: error instanceof Error ? error.message : "Support detail API request failed" });
    }
  }, [accessToken, ticketId]);
  useEffect(() => { void loadTicket(); }, [loadTicket]);
  if (!accessToken) return <DemoSupportDetail ticketId={ticketId} note="Live API не подключён в preview. Показана demo заявка." />;
  if (state.status === "loading") return <EmptyPanel title="Ticket detail">Loading real support ticket...</EmptyPanel>;
  if (state.status === "error") return <DemoSupportDetail ticketId={ticketId} note={`Live API временно недоступен: ${state.error}. Показан demo fallback.`} />;
  if (!state.data) return <EmptyPanel title="Ticket detail">No support ticket loaded.</EmptyPanel>;
  const ticket = state.data;
  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]"><AdminPanel className="overflow-hidden"><div className="border-b border-[rgb(var(--border))] p-4"><h2 className="m-0 text-base font-black">Conversation</h2></div><div className="space-y-3 p-4">{ticket.messages.length ? ticket.messages.map((message) => <Message key={message.id} who={userName(message.sender)} text={message.text ?? "Attachment only message"} meta={formatDate(message.createdAt)} attachments={message.attachments} />) : <p className="text-sm text-[rgb(var(--text-muted))]">No messages returned by API.</p>}</div></AdminPanel><AdminPanel className="p-4"><h2 className="m-0 mb-3 text-base font-black">Ticket context</h2><DetailGrid items={[["Requester", <LinkedValue key="u" href={`/users/${ticket.requester.id}`}>{userName(ticket.requester)}</LinkedValue>], ["Trip", ticket.tripId ? <LinkedValue key="t" href={`/trips/${ticket.tripId}`}>{ticket.tripId}</LinkedValue> : "-"], ["Booking", ticket.bookingId ? <LinkedValue key="b" href={`/bookings/${ticket.bookingId}`}>{ticket.bookingId}</LinkedValue> : "-"], ["Driver", ticket.driverId ? <LinkedValue key="d" href={`/drivers/${ticket.driverId}`}>{ticket.driverId}</LinkedValue> : "-"], ["Type", ticket.type], ["Status", <Status key="s" value={ticket.status} />], ["Priority", <Status key="p" value={ticket.priority} />], ["Assigned", ticket.assignedTo ? userName(ticket.assignedTo) : "Unassigned"], ["SLA", formatDate(ticket.slaDueAt)], ["Attachments", `${ticket.messages.flatMap((message) => message.attachments).length} files`], ["Retention", formatDate(ticket.retentionUntil)]]} /></AdminPanel></div>;
}

function Message({ who, text, meta, attachments }: { who: string; text: string; meta: string; attachments: Array<{ id: string; originalFileName: string; mimeType: string; sizeBytes: number; status: string }> }) {
  return <div className="rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] p-3"><div className="flex flex-wrap justify-between gap-2 text-xs font-black text-[rgb(var(--primary))]"><span>{who}</span><span>{meta}</span></div><p className="m-0 mt-1 text-sm">{text}</p>{attachments.length ? <div className="mt-2 grid gap-1 text-xs text-[rgb(var(--text-muted))]">{attachments.map((file) => <span key={file.id}>{file.originalFileName} · {file.mimeType} · {Math.ceil(file.sizeBytes / 1024)} KB · {file.status}</span>)}</div> : null}</div>;
}

export function TripsListRealData() {
  const { accessToken, login, status } = useAdminAccessToken();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const [state, setState] = useState<LoadState<AdminTrip[]>>({ status: "idle", data: null, error: null });
  const loadTrips = useCallback(async (token = accessToken) => {
    if (!token) return;
    setState({ status: "loading", data: null, error: null });
    try {
      const body = await listAdminTrips({}, authOptions(token));
      setState({ status: "loaded", data: body.trips, error: null });
    } catch (error) {
      setState({ status: "error", data: null, error: error instanceof Error ? error.message : "Trips API request failed" });
    }
  }, [accessToken]);
  useEffect(() => { void loadTrips(); }, [loadTrips]);
  const rows = useMemo(() => (state.data ?? []).filter((trip) => {
    const text = `${trip.id} ${routeName(trip)} ${userName(trip.driverProfile?.user)} ${trip.status}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (filter === "All statuses" || trip.status === filter);
  }), [filter, query, state.data]);
  if (!accessToken) return <DemoTripsList note="Live API не подключён в preview. Показан стабильный demo список поездок." />;
  return <AdminPanel className="overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgb(var(--border))] p-3"><Status value={status} /><Button onClick={() => loadTrips()} variant="secondary">Refresh</Button></div><Toolbar query={query} onQuery={setQuery} filters={["All statuses", "DRAFT", "PUBLISHED", "BOOKING_OPEN", "BOARDING", "IN_PROGRESS", "COMPLETED", "CANCELLED", "BLOCKED"]} activeFilter={filter} onFilter={setFilter} placeholder="Маршрут, водитель, ID поездки" count={rows.length} />{state.status === "loading" ? <div className="p-6 text-sm font-semibold text-[rgb(var(--text-muted))]">Загружаем поездки...</div> : null}{state.status === "error" ? <div className="p-6 text-sm font-semibold text-red-700">{state.error}</div> : null}{state.status === "loaded" ? <DataTable rows={rows} hrefFor={(row) => `/trips/${row.id}`} empty="API не вернул поездки." columns={[{ key: "route", label: "Маршрут", sortValue: routeName, render: (row) => <strong>{routeName(row)}</strong> }, { key: "driver", label: "Водитель", render: (row) => userName(row.driverProfile?.user) }, { key: "departure", label: "Выезд", sortValue: (row) => row.departureAtUtc, render: (row) => formatDate(row.departureAtUtc) }, { key: "status", label: "Статус", render: (row) => <Status value={row.status} /> }, { key: "seats", label: "Места", render: (row) => `${row.availableSeatCount}/${row.passengerSeatCapacity}` }, { key: "vehicle", label: "Авто", render: vehicleName }, { key: "eta", label: "ETA", render: (row) => formatDate(row.arrivalEstimateAtUtc) }]} /> : null}</AdminPanel>;
}

export function TripDetailRealData({ tripId }: { tripId: string }) {
  const { accessToken, login } = useAdminAccessToken();
  const [tripState, setTripState] = useState<LoadState<AdminTrip>>({ status: "idle", data: null, error: null });
  const [history, setHistory] = useState<AdminTripHistoryResponse | null>(null);
  const [operations, setOperations] = useState<AdminTripOperationsResponse | null>(null);
  const loadTrip = useCallback(async (token = accessToken) => {
    if (!token) return;
    setTripState({ status: "loading", data: null, error: null });
    try {
      const [tripBody, historyBody, operationsBody] = await Promise.all([
        getAdminTrip(tripId, authOptions(token)),
        getAdminTripHistory(tripId, authOptions(token)),
        getAdminTripOperations(tripId, authOptions(token)),
      ]);
      setTripState({ status: "loaded", data: tripBody.trip, error: null });
      setHistory(historyBody);
      setOperations(operationsBody);
    } catch (error) {
      setTripState({ status: "error", data: null, error: error instanceof Error ? error.message : "Trip detail API request failed" });
    }
  }, [accessToken, tripId]);
  useEffect(() => { void loadTrip(); }, [loadTrip]);
  if (!accessToken) return <DemoTripDetail tripId={tripId} note="Live API не подключён в preview. Показана demo поездка." />;
  if (tripState.status === "loading") return <EmptyPanel title="Trip detail">Loading real trip...</EmptyPanel>;
  if (tripState.status === "error") return <DemoTripDetail tripId={tripId} note={`Live API временно недоступен: ${tripState.error}. Показан demo fallback.`} />;
  if (!tripState.data) return <EmptyPanel title="Trip detail">No trip loaded.</EmptyPanel>;
  const trip = tripState.data;
  const bookings = Array.isArray(operations?.bookings) ? operations.bookings : [];
  const timeline = history?.timeline ?? trip.timelineEvents ?? [];
  const moderation = history?.moderation ?? trip.moderationEvents ?? [];
  return <div className="admin-detail-layout"><AdminPanel className="p-4"><DetailGrid items={[["Driver", trip.driverProfile?.id ? <LinkedValue key="d" href={`/drivers/${trip.driverProfile.id}`}>{userName(trip.driverProfile.user)}</LinkedValue> : userName(trip.driverProfile?.user)], ["Vehicle", vehicleName(trip)], ["Status", <Status key="s" value={trip.status} />], ["Departure", formatDate(trip.departureAtUtc)], ["Seats", `${trip.availableSeatCount}/${trip.passengerSeatCapacity}`], ["Bookings", String(bookings.length)], ["Whole-car", trip.wholeCarPriceMinor ? `${trip.wholeCarPriceMinor}` : "-"], ["Start PIN", bookings.some((booking) => Array.isArray(booking.startPins) && booking.startPins.length) ? <Status key="p" value="Present" /> : "Not returned"], ["ETA", formatDate(trip.arrivalEstimateAtUtc)], ["GPS", Array.isArray(operations?.locations) ? `${operations.locations.length} pings` : "Use trip history API"], ["Reliability", trip.driverProfile?.reliabilityScore == null ? "-" : String(trip.driverProfile.reliabilityScore)]]} /></AdminPanel><Tabs tabs={[{ label: "Passengers", content: bookings.length ? bookings.map((booking) => <Row key={String(booking.id)} href={`/bookings/${booking.id}`} title={userName(booking.client)} meta={String(booking.status ?? "BOOKING")} />) : <span className="text-sm text-[rgb(var(--text-muted))]">No bookings returned by operations API.</span> }, { label: "Bookings", content: bookings.length ? bookings.map((booking) => <Row key={String(booking.id)} href={`/bookings/${booking.id}`} title={String(booking.id)} meta={String(booking.status ?? "BOOKING")} />) : <span className="text-sm text-[rgb(var(--text-muted))]">No booking records returned.</span> }, { label: "Timeline", content: <EventList items={timeline} /> }, { label: "GPS history", content: <JsonBlock value={operations?.locations ?? operations?.locationHistory ?? "No GPS payload returned by admin operations API."} /> }, { label: "Fraud flags", content: <EventList items={moderation} /> }, { label: "Rewards", content: <JsonBlock value={operations?.rewards ?? "No rewards relation returned by admin trip endpoints."} /> }, { label: "Support", content: <Link className="font-black text-[rgb(var(--primary))] no-underline hover:underline" href={`/support?tripId=${trip.id}`}>Open support tickets for this trip</Link> }, { label: "Matching", content: <JsonBlock value={operations?.matching ?? operations?.waitlist ?? "No matching relation returned by admin trip endpoints."} /> }]} /></div>;
}

function EventList({ items }: { items: Array<Record<string, unknown>> }) {
  if (!items.length) return <span className="text-sm text-[rgb(var(--text-muted))]">No events returned by API.</span>;
  return <div className="grid gap-2">{items.map((item, index) => <div className="rounded-[8px] border border-[rgb(var(--border))] p-3 text-sm" key={String(item.id ?? index)}><strong>{String(item.type ?? item.eventType ?? item.status ?? "Event")}</strong><div className="text-xs text-[rgb(var(--text-muted))]">{formatDate(String(item.createdAt ?? item.occurredAt ?? ""))}</div></div>)}</div>;
}

function JsonBlock({ value }: { value: unknown }) {
  return <pre className="max-h-80 overflow-auto rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] p-3 text-xs">{typeof value === "string" ? value : JSON.stringify(value, null, 2)}</pre>;
}

function Row({ href, title, meta }: { href: string; title: string; meta: string }) {
  return <a className="mb-2 grid grid-cols-[1fr_auto] rounded-[8px] border border-[rgb(var(--border))] p-3 text-[rgb(var(--foreground))] no-underline hover:bg-[rgb(var(--surface-muted))]" href={href}><strong>{title}</strong><Status value={meta} /></a>;
}
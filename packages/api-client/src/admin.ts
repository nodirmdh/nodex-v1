import { nodexFetch } from "./mutator";

export type AdminPublicUser = {
  id: string;
  displayName: string | null;
  username: string | null;
  phone?: string | null;
  status?: string;
  roles?: string[];
};

export type AdminSupportAttachment = {
  id: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
};

export type AdminSupportMessage = {
  id: string;
  text: string | null;
  status: string;
  readAt: string | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  sender: AdminPublicUser;
  attachments: AdminSupportAttachment[];
};

export type AdminSupportTicket = {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  status: string;
  priority: string;
  bookingId: string | null;
  tripId: string | null;
  parcelOrderId: string | null;
  driverId: string | null;
  requesterRole: string;
  requester: AdminPublicUser;
  assignedTo: AdminPublicUser | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  slaDueAt: string | null;
  retentionUntil: string | null;
  createdAt: string;
  updatedAt: string;
  participants?: Array<{ id: string; role: string; user: AdminPublicUser }>;
  messages: AdminSupportMessage[];
  internalNotes?: Array<{ id: string; body: string; createdAt: string; author: AdminPublicUser }>;
  assignments?: Array<{ id: string; createdAt: string; assigneeId: string | null }>;
  statusEvents?: Array<{ id: string; fromStatus: string | null; toStatus: string; createdAt: string; actor: AdminPublicUser | null }>;
};

export type AdminSupportTicketsResponse = { tickets: AdminSupportTicket[] };
export type AdminSupportTicketResponse = { ticket: AdminSupportTicket };

export type AdminTrip = {
  id: string;
  status: string;
  driverProfileId: string;
  vehicleId: string;
  routeId?: string | null;
  originCityId?: string | null;
  destinationCityId?: string | null;
  departureAtUtc: string;
  arrivalEstimateAtUtc: string | null;
  availableSeatCount: number;
  passengerSeatCapacity: number;
  wholeCarPriceMinor?: string | number | null;
  createdAt?: string;
  updatedAt?: string;
  vehicle?: Record<string, unknown> | null;
  route?: {
    originCity?: { nameRu?: string | null; nameUz?: string | null; nameKaa?: string | null; code?: string | null } | null;
    destinationCity?: { nameRu?: string | null; nameUz?: string | null; nameKaa?: string | null; code?: string | null } | null;
  } | null;
  origin?: { nameRu?: string | null; nameUz?: string | null; nameKaa?: string | null; code?: string | null } | null;
  destination?: { nameRu?: string | null; nameUz?: string | null; nameKaa?: string | null; code?: string | null } | null;
  stops?: Array<Record<string, unknown>>;
  seatSnapshot?: Record<string, unknown> | null;
  timelineEvents?: Array<Record<string, unknown>>;
  moderationEvents?: Array<Record<string, unknown>>;
  driverProfile?: {
    id?: string;
    reliabilityScore?: number | null;
    verificationStatus?: string | null;
    user?: AdminPublicUser | null;
  } | null;
};

export type AdminTripsResponse = { trips: AdminTrip[] };
export type AdminTripResponse = { trip: AdminTrip };
export type AdminTripHistoryResponse = { timeline: Array<Record<string, unknown>>; moderation: Array<Record<string, unknown>> };
export type AdminTripOperationsResponse = Record<string, unknown>;

export function listAdminSupportTickets(options?: RequestInit) {
  return nodexFetch<AdminSupportTicketsResponse>("admin/support/tickets", options);
}

export function getAdminSupportTicket(ticketId: string, options?: RequestInit) {
  return nodexFetch<AdminSupportTicketResponse>(`admin/support/tickets/${encodeURIComponent(ticketId)}`, options);
}

export function listAdminTrips(params: { status?: string } = {}, options?: RequestInit) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  const suffix = search.toString();
  return nodexFetch<AdminTripsResponse>(`admin/trips${suffix ? `?${suffix}` : ""}`, options);
}

export function getAdminTrip(tripId: string, options?: RequestInit) {
  return nodexFetch<AdminTripResponse>(`admin/trips/${encodeURIComponent(tripId)}`, options);
}

export function getAdminTripHistory(tripId: string, options?: RequestInit) {
  return nodexFetch<AdminTripHistoryResponse>(`admin/trips/${encodeURIComponent(tripId)}/history`, options);
}

export function getAdminTripOperations(tripId: string, options?: RequestInit) {
  return nodexFetch<AdminTripOperationsResponse>(`admin/trips/${encodeURIComponent(tripId)}/operations`, options);
}
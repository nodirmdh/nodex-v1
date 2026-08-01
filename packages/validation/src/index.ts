import { z } from "zod";

export const idempotencyKeySchema = z.string().min(8).max(128);
export const uzsMinorSchema = z.bigint().nonnegative();

export const driverVerificationStatuses = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "REJECTED",
  "WITHDRAWN",
  "SUSPENDED",
] as const;

export const driverVerificationDocumentTypes = [
  "IDENTITY_FRONT",
  "IDENTITY_BACK",
  "DRIVER_LICENSE_FRONT",
  "DRIVER_LICENSE_BACK",
  "VEHICLE_REGISTRATION_FRONT",
  "VEHICLE_REGISTRATION_BACK",
  "DRIVER_SELFIE",
  "DRIVER_WITH_LICENSE_SELFIE",
  "VEHICLE_FRONT",
  "VEHICLE_REAR",
  "VEHICLE_LEFT",
  "VEHICLE_RIGHT",
  "VEHICLE_INTERIOR",
] as const;

export const driverVerificationReasonCodes = [
  "DOCUMENT_UNREADABLE",
  "DOCUMENT_EXPIRED",
  "DOCUMENT_MISMATCH",
  "SELFIE_MISMATCH",
  "MISSING_DOCUMENT",
  "INVALID_LICENSE_CATEGORY",
  "INVALID_VEHICLE_DATA",
  "VEHICLE_PHOTO_INCOMPLETE",
  "DUPLICATE_DRIVER",
  "FRAUD_SUSPECTED",
  "OTHER",
] as const;

export const vehicleStatuses = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "ARCHIVED",
] as const;

export const vehicleDocumentTypes = [
  "REGISTRATION_CERTIFICATE",
  "INSURANCE",
  "TECHNICAL_INSPECTION",
  "OWNERSHIP_OR_USAGE_PROOF",
  "OTHER",
] as const;

export const vehiclePhotoTypes = [
  "FRONT",
  "REAR",
  "LEFT_SIDE",
  "RIGHT_SIDE",
  "INTERIOR_FRONT",
  "INTERIOR_REAR",
  "PLATE",
  "OTHER",
] as const;

export const vehicleModerationReasonCodes = [
  "DOCUMENT_UNREADABLE",
  "DOCUMENT_EXPIRED",
  "DOCUMENT_MISMATCH",
  "PHOTO_INCOMPLETE",
  "PLATE_MISMATCH",
  "INVALID_VEHICLE_DATA",
  "DUPLICATE_PLATE",
  "SAFETY_CONCERN",
  "OTHER",
] as const;

export const tripStatuses = [
  "DRAFT",
  "PUBLISHED",
  "BOOKING_OPEN",
  "FULL",
  "UNPUBLISHED",
  "CANCELLED",
  "EXPIRED",
  "BOARDING",
  "IN_PROGRESS",
  "COMPLETED",
  "BLOCKED",
] as const;

export const operationalTripStatuses = [
  "PUBLISHED",
  "BOOKING_OPEN",
  "FULL",
  "BOARDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "BLOCKED",
] as const;

export const operationalBookingStatuses = [
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "BOARDING",
  "IN_PROGRESS",
  "COMPLETED",
  "NO_SHOW_CLIENT",
  "NO_SHOW_DRIVER",
  "CANCELLED_BY_CLIENT",
  "CANCELLED_BY_DRIVER",
  "CANCELLED_BY_ADMIN",
  "EXPIRED",
] as const;

export const pickupPointTypes = [
  "CITY_CENTER",
  "BUS_STATION",
  "RAILWAY_STATION",
  "AIRPORT",
  "CUSTOM",
] as const;

export const tripStopTypes = ["ORIGIN", "INTERMEDIATE", "DESTINATION"] as const;

const textField = z.string().trim().min(1).max(160);
const optionalTextField = z.string().trim().max(240).optional().nullable();
const dateField = z.coerce.date().optional().nullable();
const queryBoolean = z.preprocess((value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}, z.boolean());

export const driverVerificationDraftSchema = z.object({
  legalFirstName: optionalTextField,
  legalLastName: optionalTextField,
  legalMiddleName: optionalTextField,
  birthDate: dateField,
  gender: optionalTextField,
  citizenship: optionalTextField,
  personalIdentificationNumber: optionalTextField,
  registeredAddress: optionalTextField,
  residentialAddress: optionalTextField,
  phone: optionalTextField,
  emergencyContactName: optionalTextField,
  emergencyContactPhone: optionalTextField,
  driverLicenseNumber: optionalTextField,
  driverLicenseIssuedAt: dateField,
  driverLicenseExpiresAt: dateField,
  driverLicenseCategory: optionalTextField,
  driverExperienceSince: dateField,
  vehicleMake: optionalTextField,
  vehicleModel: optionalTextField,
  vehicleYear: z.coerce.number().int().min(1980).max(2100).optional().nullable(),
  vehicleColor: optionalTextField,
  vehiclePlateNumber: optionalTextField,
  vehicleRegistrationNumber: optionalTextField,
  vehicleSeats: z.coerce.number().int().min(1).max(60).optional().nullable(),
  consentAccepted: z.boolean().optional(),
});

export const driverDocumentPresignSchema = z.object({
  type: z.enum(driverVerificationDocumentTypes),
  originalFileName: textField.max(180),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
  size: z.coerce.number().int().positive(),
  checksum: z.string().trim().min(16).max(128),
});

export const driverDocumentCompleteSchema = driverDocumentPresignSchema.extend({
  storageKey: z.string().trim().min(16).max(300),
});

export const driverReviewDecisionSchema = z.object({
  reasonCode: z.enum(driverVerificationReasonCodes).optional(),
  comment: z.string().trim().max(1000).optional(),
  version: z.coerce.number().int().positive().optional(),
});

const vehicleYear = new Date().getUTCFullYear() + 1;

export const vehicleDraftSchema = z.object({
  make: optionalTextField,
  model: optionalTextField,
  year: z.coerce.number().int().min(1980).max(vehicleYear).optional().nullable(),
  color: optionalTextField,
  plateNumber: optionalTextField,
  bodyType: optionalTextField,
  passengerSeatCount: z.coerce.number().int().min(1).max(16).optional().nullable(),
  luggageCapacity: optionalTextField,
  amenities: z.array(z.string().trim().min(1).max(60)).max(20).optional().default([]),
});

export const vehicleDocumentPresignSchema = z.object({
  type: z.enum(vehicleDocumentTypes),
  originalFileName: textField.max(180),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
  size: z.coerce
    .number()
    .int()
    .positive()
    .max(12 * 1024 * 1024),
  checksum: z.string().trim().min(16).max(128),
});

export const vehicleDocumentCompleteSchema = vehicleDocumentPresignSchema.extend({
  storageKey: z.string().trim().min(16).max(300),
});

export const vehiclePhotoPresignSchema = z.object({
  type: z.enum(vehiclePhotoTypes),
  originalFileName: textField.max(180),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z.coerce
    .number()
    .int()
    .positive()
    .max(12 * 1024 * 1024),
  checksum: z.string().trim().min(16).max(128),
});

export const vehiclePhotoCompleteSchema = vehiclePhotoPresignSchema.extend({
  storageKey: z.string().trim().min(16).max(300),
});

export const vehicleModerationDecisionSchema = z.object({
  reasonCode: z.enum(vehicleModerationReasonCodes).optional(),
  comment: z.string().trim().max(1000).optional(),
  version: z.coerce.number().int().positive().optional(),
});

export const regionSchema = z.object({
  countryCode: z.string().trim().length(2).default("UZ"),
  code: z.string().trim().min(2).max(40),
  name: textField,
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(10000).optional(),
});

export const citySchema = z.object({
  regionId: z.string().trim().min(1),
  code: z.string().trim().min(2).max(60),
  nameRu: textField,
  nameUz: textField,
  nameKaa: textField,
  timezone: z.string().trim().min(3).max(80).default("Asia/Tashkent"),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  isActive: z.boolean().optional(),
  isLaunchCity: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(10000).optional(),
});

export const pickupPointSchema = z.object({
  cityId: z.string().trim().min(1),
  name: textField,
  address: optionalTextField,
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  type: z.enum(pickupPointTypes).default("CUSTOM"),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(10000).optional(),
});

export const routeSchema = z.object({
  originCityId: z.string().trim().min(1),
  destinationCityId: z.string().trim().min(1),
  distanceKm: z.coerce.number().int().positive().max(5000).optional().nullable(),
  estimatedDurationMinutes: z.coerce.number().int().positive().max(10080).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const tripStopSchema = z.object({
  cityId: z.string().trim().min(1),
  pickupPointId: z.string().trim().min(1).optional().nullable(),
  order: z.coerce.number().int().min(0).max(50),
  type: z.enum(tripStopTypes),
  plannedAtUtc: z.coerce.date().optional().nullable(),
  label: optionalTextField,
  address: optionalTextField,
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
});

export const tripDraftSchema = z.object({
  vehicleId: z.string().trim().min(1).optional(),
  routeId: z.string().trim().min(1).optional().nullable(),
  originCityId: z.string().trim().min(1).optional().nullable(),
  destinationCityId: z.string().trim().min(1).optional().nullable(),
  departureAtUtc: z.coerce.date().optional(),
  arrivalEstimateAtUtc: z.coerce.date().optional().nullable(),
  timezone: z.string().trim().min(3).max(80).default("Asia/Tashkent"),
  passengerSeatCapacity: z.coerce.number().int().min(1).max(16).optional(),
  pricePerSeatMinor: z.coerce.bigint().nonnegative().optional(),
  wholeCarPriceMinor: z.coerce.bigint().nonnegative().optional().nullable(),
  parcelSupported: z.boolean().optional(),
  parcelPriceMinor: z.coerce.bigint().nonnegative().optional().nullable(),
  currency: z.literal("UZS").default("UZS"),
  luggageRules: optionalTextField,
  comment: z.string().trim().max(1000).optional().nullable(),
  stops: z.array(tripStopSchema).max(20).optional(),
});

export const tripCancelSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
});

export const tripAdminActionSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
});

export const tripSearchSorts = [
  "departure_asc",
  "price_asc",
  "price_desc",
  "available_seats_desc",
] as const;

export const searchEventTypes = [
  "SEARCH_PERFORMED",
  "TRIP_RESULT_OPENED",
  "SHARE_CLICKED",
  "BOOKING_CTA_CLICKED",
] as const;

export const tripSearchQuerySchema = z
  .object({
    originCityId: z.string().trim().min(1),
    destinationCityId: z.string().trim().min(1),
    date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/),
    passengers: z.coerce.number().int().min(1).max(16).default(1),
    page: z.coerce.number().int().min(1).max(1000).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
    sort: z.enum(tripSearchSorts).default("departure_asc"),
    departureWindow: z.enum(["morning", "afternoon", "evening", "night"]).optional(),
    minPriceMinor: z.coerce.bigint().nonnegative().optional(),
    maxPriceMinor: z.coerce.bigint().nonnegative().optional(),
    parcelSupported: queryBoolean.optional(),
    wholeCarAvailable: queryBoolean.optional(),
    luggageRequired: queryBoolean.optional(),
    vehicleBodyType: z.string().trim().min(1).max(80).optional(),
    sessionId: z.string().trim().min(8).max(128).optional(),
  })
  .refine((value) => value.originCityId !== value.destinationCityId, {
    path: ["destinationCityId"],
    message: "Origin and destination must differ",
  });

export const searchEventSchema = z.object({
  type: z.enum(searchEventTypes),
  tripId: z.string().trim().min(1).optional(),
  originCityId: z.string().trim().min(1).optional(),
  destinationCityId: z.string().trim().min(1).optional(),
  queryDate: z.coerce.date().optional(),
  passengers: z.coerce.number().int().min(1).max(16).default(1),
  sort: z.enum(tripSearchSorts).optional(),
  selectedResultRank: z.coerce.number().int().min(1).max(1000).optional(),
  sessionId: z.string().trim().min(8).max(128).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
});

export const bookingTypes = ["SEAT", "MULTI_SEAT", "WHOLE_CAR"] as const;
export const bookingPaymentMethods = ["CASH", "MANUAL_TRANSFER"] as const;
export const ageCategories = ["ADULT", "CHILD", "INFANT"] as const;
export const baggageTypes = ["CABIN_BAG", "SUITCASE", "OVERSIZED", "OTHER"] as const;

export type SeatLayoutItem = {
  seatKey: string;
  label: string;
  row: number;
  column: number;
  seatType: "FRONT" | "REAR" | "STANDARD";
};

export function generateSeatLayout(passengerSeatCount: number): SeatLayoutItem[] {
  const count = Math.max(1, Math.min(16, Math.floor(passengerSeatCount)));
  const seats: SeatLayoutItem[] = [
    { seatKey: "FRONT_RIGHT", label: "Front right", row: 0, column: 1, seatType: "FRONT" },
  ];
  for (let index = 1; index < count; index += 1) {
    const rearIndex = index - 1;
    const row = Math.floor(rearIndex / 2) + 1;
    const column = rearIndex % 2;
    seats.push({
      seatKey: `ROW_${row}_${column === 0 ? "LEFT" : "RIGHT"}`,
      label: `Row ${row} ${column === 0 ? "left" : "right"}`,
      row,
      column,
      seatType: row === 1 ? "REAR" : "STANDARD",
    });
  }
  return seats;
}

const bookingPassengerSchema = z.object({
  firstName: textField.max(80),
  lastName: optionalTextField,
  phone: optionalTextField,
  ageCategory: z.enum(ageCategories).default("ADULT"),
  seatKey: z.string().trim().min(1).max(80).optional(),
  notes: optionalTextField,
});

export const bookingBaggageSchema = z.object({
  type: z.enum(baggageTypes).default("SUITCASE"),
  quantity: z.coerce.number().int().min(1).max(20).default(1),
  weightKg: z.coerce.number().min(0).max(200).optional().nullable(),
  notes: optionalTextField,
});

export const bookingHoldSchema = z.object({
  tripId: z.string().trim().min(1),
  type: z.enum(bookingTypes).default("SEAT"),
  seatKeys: z.array(z.string().trim().min(1).max(80)).min(1).max(16),
  passengerCount: z.coerce.number().int().min(1).max(16),
  pickupPointId: z.string().trim().min(1).optional().nullable(),
  destinationPickupPointId: z.string().trim().min(1).optional().nullable(),
  paymentMethod: z.enum(bookingPaymentMethods).default("CASH"),
});

export const bookingConfirmSchema = z.object({
  passengers: z.array(bookingPassengerSchema).min(1).max(16),
  baggage: z.array(bookingBaggageSchema).max(8).default([]),
  clientComment: z.string().trim().max(1000).optional().nullable(),
  consentAccepted: z.literal(true),
  paymentMethod: z.enum(bookingPaymentMethods).default("CASH"),
});

export const bookingCancelSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
});

export const driverBookingDecisionSchema = z.object({
  reason: z.string().trim().min(3).max(1000).optional(),
});

export const boardingCodeVerifySchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{4,6}$/),
});

export const boardingCodeRegenerateSchema = z.object({
  reason: z.string().trim().min(3).max(1000).optional(),
});

export const operationReasonSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
});

export const tripStartSchema = z.object({
  allowUnresolvedPassengers: z.boolean().optional().default(false),
});

export const tripCompleteSchema = z.object({
  notes: z.string().trim().max(1000).optional(),
});

export type TripOperationAction =
  | "START_BOARDING"
  | "START_TRIP"
  | "COMPLETE_TRIP"
  | "CANCEL_TRIP"
  | "EXPIRE_TRIP"
  | "BLOCK_TRIP"
  | "UNBLOCK_TRIP";

export type TripOperationStatus = (typeof tripStatuses)[number];

export type TripTransitionResult =
  | { ok: true; toStatus: TripOperationStatus; idempotent: boolean }
  | { ok: false; code: string; message: string };

const tripTransitionTargets = {
  START_BOARDING: "BOARDING",
  START_TRIP: "IN_PROGRESS",
  COMPLETE_TRIP: "COMPLETED",
  CANCEL_TRIP: "CANCELLED",
  EXPIRE_TRIP: "EXPIRED",
  BLOCK_TRIP: "BLOCKED",
  UNBLOCK_TRIP: "PUBLISHED",
} as const satisfies Record<TripOperationAction, TripOperationStatus>;

const tripAllowedTransitions = {
  START_BOARDING: ["PUBLISHED", "BOOKING_OPEN", "FULL"],
  START_TRIP: ["BOARDING"],
  COMPLETE_TRIP: ["IN_PROGRESS"],
  CANCEL_TRIP: ["PUBLISHED", "BOOKING_OPEN", "FULL", "BOARDING"],
  EXPIRE_TRIP: ["PUBLISHED", "BOOKING_OPEN"],
  BLOCK_TRIP: ["PUBLISHED", "BOOKING_OPEN", "FULL", "BOARDING"],
  UNBLOCK_TRIP: ["BLOCKED"],
} as const satisfies Record<TripOperationAction, readonly TripOperationStatus[]>;

export function evaluateTripTransition(
  currentStatus: TripOperationStatus,
  action: TripOperationAction,
): TripTransitionResult {
  const toStatus = tripTransitionTargets[action];
  if (currentStatus === toStatus) return { ok: true, toStatus, idempotent: true };
  const allowedStatuses: readonly TripOperationStatus[] = tripAllowedTransitions[action];
  if (!allowedStatuses.includes(currentStatus)) {
    return {
      ok: false,
      code: "TRIP_INVALID_TRANSITION",
      message: `${currentStatus} cannot transition via ${action}`,
    };
  }
  return { ok: true, toStatus, idempotent: false };
}

export function boardingCodeIsExpired(expiresAt: Date, now = new Date()) {
  return expiresAt.getTime() <= now.getTime();
}

export function boardingCodeCanAttempt(input: {
  status: string;
  expiresAt: Date;
  attemptsCount: number;
  maxAttempts: number;
  lockedAt?: Date | null;
  verifiedAt?: Date | null;
  now?: Date;
}) {
  if (input.status !== "ACTIVE") return { ok: false, code: "BOARDING_CODE_INACTIVE" };
  if (input.verifiedAt) return { ok: false, code: "BOARDING_CODE_USED" };
  if (input.lockedAt) return { ok: false, code: "BOARDING_CODE_LOCKED" };
  if (boardingCodeIsExpired(input.expiresAt, input.now)) {
    return { ok: false, code: "BOARDING_CODE_EXPIRED" };
  }
  if (input.attemptsCount >= input.maxAttempts) {
    return { ok: false, code: "BOARDING_CODE_MAX_ATTEMPTS" };
  }
  return { ok: true, code: "BOARDING_CODE_ATTEMPT_ALLOWED" };
}

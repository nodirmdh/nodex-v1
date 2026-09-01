import { distanceMetersBetween } from "@nodex/maps";
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

export const waitlistEntryCreateSchema = z
  .object({
    originCityId: z.string().trim().min(1),
    destinationCityId: z.string().trim().min(1),
    requestedDate: z.coerce.date(),
    preferredDepartureAtUtc: z.coerce.date().optional(),
    timeWindowHours: z.coerce.number().int().min(1).max(24).optional(),
    passengerCount: z.coerce.number().int().min(1).max(16).default(1),
    wholeCar: queryBoolean.default(false),
    expiresAt: z.coerce.date().optional(),
  })
  .refine((value) => value.originCityId !== value.destinationCityId, {
    path: ["destinationCityId"],
    message: "Origin and destination must differ",
  });

export type WaitlistMatchTripContext = {
  originCityId: string | null;
  destinationCityId: string | null;
  status: string;
  availableSeatCount: number;
  passengerSeatCapacity: number;
  wholeCarPriceMinor?: bigint | number | string | null;
  departureAtUtc: Date;
  cancelledAt?: Date | null;
  blockedAt?: Date | null;
};

export type WaitlistMatchEntryContext = {
  originCityId: string;
  destinationCityId: string;
  requestedDate: Date;
  passengerCount: number;
  wholeCar: boolean;
  preferredDepartureAtUtc?: Date | null;
  timeWindowHours?: number | null;
  expiresAt: Date;
  status: string;
};

export function canMatchWaitlistEntryToTrip(
  trip: WaitlistMatchTripContext,
  entry: WaitlistMatchEntryContext,
  options: { now?: Date; defaultTimeWindowHours?: number } = {},
) {
  const now = options.now ?? new Date();
  const windowHours = entry.timeWindowHours ?? options.defaultTimeWindowHours ?? 3;
  const tripDate = trip.departureAtUtc.toISOString().slice(0, 10);
  const requestedDate = entry.requestedDate.toISOString().slice(0, 10);
  if (!trip.originCityId || !trip.destinationCityId) return false;
  if (
    trip.originCityId !== entry.originCityId ||
    trip.destinationCityId !== entry.destinationCityId
  ) {
    return false;
  }
  if (tripDate !== requestedDate) return false;
  if (!["PUBLISHED", "BOOKING_OPEN"].includes(trip.status)) return false;
  if (trip.cancelledAt || trip.blockedAt) return false;
  if (trip.departureAtUtc <= now) return false;
  if (entry.status !== "ACTIVE" || entry.expiresAt <= now) return false;
  if (entry.preferredDepartureAtUtc) {
    const deltaMs = Math.abs(
      trip.departureAtUtc.getTime() - entry.preferredDepartureAtUtc.getTime(),
    );
    if (deltaMs > windowHours * 60 * 60 * 1000) return false;
  }
  if (entry.wholeCar) {
    if (!trip.wholeCarPriceMinor) return false;
    return trip.availableSeatCount === trip.passengerSeatCapacity;
  }
  return trip.availableSeatCount >= entry.passengerCount;
}
export const savedRouteCreateSchema = z
  .object({
    originCityId: z.string().trim().min(1),
    destinationCityId: z.string().trim().min(1),
    preferredDepartureWindow: z.enum(["morning", "afternoon", "evening", "night"]).optional(),
  })
  .refine((value) => value.originCityId !== value.destinationCityId, {
    path: ["destinationCityId"],
    message: "Origin and destination must differ",
  });

export const returnTripDraftSchema = z.object({
  departureAtUtc: z.coerce.date(),
});

export const bookingTypes = ["SEAT", "MULTI_SEAT", "WHOLE_CAR"] as const;
export const bookingPaymentMethods = ["CASH", "MANUAL_TRANSFER"] as const;
export const ageCategories = ["ADULT", "CHILD", "INFANT"] as const;
export const baggageTypes = ["CABIN_BAG", "SUITCASE", "OVERSIZED", "OTHER"] as const;
export const bookingPreferenceTypes = [
  "CHILD",
  "PET",
  "ASSISTANCE",
  "NO_SMOKING",
  "STOP_ON_ROUTE",
  "QUIET_RIDE",
] as const;
export const bookingScheduleOptions = ["NOW", "TODAY", "TOMORROW", "CUSTOM"] as const;

export const parcelStatuses = [
  "DRAFT",
  "CREATED",
  "PENDING_DRIVER_ACCEPTANCE",
  "ACCEPTED",
  "HANDED_TO_DRIVER",
  "IN_TRANSIT",
  "READY_FOR_PICKUP",
  "DELIVERED",
  "CANCELLED_BY_SENDER",
  "CANCELLED_BY_DRIVER",
  "CANCELLED_BY_ADMIN",
  "REJECTED",
  "LOST",
  "DAMAGED",
  "DISPUTED",
  "EXPIRED",
] as const;

export const parcelCategoryCodes = [
  "DOCUMENTS",
  "CLOTHING",
  "ELECTRONICS",
  "FOOD_NON_PERISHABLE",
  "MEDICINE_NON_PRESCRIPTION",
  "PERSONAL_ITEMS",
  "AUTO_PARTS_SMALL",
  "OTHER",
] as const;

export const prohibitedParcelCategoryCodes = [
  "CASH",
  "BANK_CARDS",
  "JEWELRY_HIGH_VALUE",
  "WEAPONS",
  "AMMUNITION",
  "EXPLOSIVES",
  "DRUGS",
  "ALCOHOL",
  "TOBACCO",
  "PERISHABLE_FOOD",
  "ANIMALS",
  "HAZARDOUS_MATERIALS",
  "ILLEGAL_ITEMS",
  "UNKNOWN_CONTENT",
] as const;

export const parcelAttachmentTypes = [
  "PACKAGE_BEFORE_HANDOVER",
  "PACKAGE_AT_HANDOVER",
  "PACKAGE_DAMAGED",
  "PACKAGE_AT_DELIVERY",
  "OTHER",
] as const;

export const defaultParcelLimits = {
  maxWeightGrams: 20_000,
  maxLengthCm: 80,
  maxWidthCm: 60,
  maxHeightCm: 60,
  maxDeclaredValueMinor: 5_000_000_00,
  maxPhotos: 6,
  maxDescriptionLength: 1000,
} as const;

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

export const bookingPreferencesSchema = z.object({
  types: z.array(z.enum(bookingPreferenceTypes)).max(16).default([]),
  driverComment: z.string().trim().max(1000).optional().nullable(),
});

export const bookingPickupLocationSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  label: z.string().trim().max(160).optional().nullable(),
  comment: z.string().trim().max(500).optional().nullable(),
});

export const bookingScheduleSchema = z.object({
  option: z.enum(bookingScheduleOptions).default("NOW"),
  requestedDepartureAtUtc: z.coerce.date().optional().nullable(),
});

export const bookingHoldSchema = z.object({
  tripId: z.string().trim().min(1),
  type: z.enum(bookingTypes).default("SEAT"),
  seatKeys: z.array(z.string().trim().min(1).max(80)).min(1).max(16),
  passengerCount: z.coerce.number().int().min(1).max(16),
  pickupPointId: z.string().trim().min(1).optional().nullable(),
  destinationPickupPointId: z.string().trim().min(1).optional().nullable(),
  requestedDepartureAtUtc: z.coerce.date().optional().nullable(),
  paymentMethod: z.enum(bookingPaymentMethods).default("CASH"),
});

export const bookingConfirmSchema = z.object({
  passengers: z.array(bookingPassengerSchema).min(1).max(16),
  baggage: z.array(bookingBaggageSchema).max(8).default([]),
  preferences: bookingPreferencesSchema.default({ types: [] }),
  pickupLocation: bookingPickupLocationSchema.optional().nullable(),
  schedule: bookingScheduleSchema.default({ option: "NOW" }),
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

export const tripLocationActorTypes = ["DRIVER", "PASSENGER"] as const;
export const tripLocationSources = [
  "PERIODIC",
  "DRIVER_ARRIVED",
  "PIN_VERIFIED",
  "TRIP_STARTED",
  "TRIP_COMPLETED",
  "MANUAL",
  "OTHER",
] as const;

export const tripLocationPointSchema = z.object({
  bookingId: z.string().trim().min(1).optional().nullable(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracyMeters: z.coerce.number().min(0).max(10000).optional().nullable(),
  speedMetersPerSecond: z.coerce.number().min(0).max(120).optional().nullable(),
  headingDegrees: z.coerce.number().min(0).max(360).optional().nullable(),
  source: z.enum(tripLocationSources).default("MANUAL"),
  reason: z.string().trim().min(1).max(80).optional().nullable(),
  recordedAt: z.coerce.date().optional(),
});

export const tripStartPinVerifySchema = z.object({
  pin: z
    .string()
    .trim()
    .regex(/^\d{4}$/),
  location: tripLocationPointSchema.omit({ bookingId: true }).optional(),
});

export type TripLocationSource = (typeof tripLocationSources)[number];

export function evaluateTripLocationWrite(input: {
  tripStatus: TripOperationStatus;
  source: TripLocationSource;
  lastRecordedAt?: Date | null;
  now?: Date;
  minIntervalMs?: number;
}) {
  const now = input.now ?? new Date();
  const activeStatuses: TripOperationStatus[] = ["BOARDING", "IN_PROGRESS"];
  const criticalSources: TripLocationSource[] = [
    "DRIVER_ARRIVED",
    "PIN_VERIFIED",
    "TRIP_STARTED",
    "TRIP_COMPLETED",
  ];
  if (input.source === "PERIODIC" && input.tripStatus !== "IN_PROGRESS") {
    return { ok: false as const, code: "LOCATION_TRIP_NOT_ACTIVE" };
  }
  if (
    !activeStatuses.includes(input.tripStatus) &&
    !(input.source === "TRIP_COMPLETED" && input.tripStatus === "COMPLETED")
  ) {
    return { ok: false as const, code: "LOCATION_TRIP_NOT_ACTIVE" };
  }
  if (
    input.source === "PERIODIC" &&
    input.lastRecordedAt &&
    now.getTime() - input.lastRecordedAt.getTime() < (input.minIntervalMs ?? 60000)
  ) {
    return { ok: false as const, code: "LOCATION_UPDATE_THROTTLED" };
  }
  return { ok: true as const, critical: criticalSources.includes(input.source) };
}

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

export const parcelDraftSchema = z.object({
  tripId: z.string().trim().min(1).optional().nullable(),
  categoryCode: z.enum(parcelCategoryCodes),
  title: textField.max(100),
  description: z.string().trim().min(3).max(defaultParcelLimits.maxDescriptionLength),
  weightGrams: z.coerce.number().int().positive().max(defaultParcelLimits.maxWeightGrams),
  lengthCm: z.coerce.number().int().positive().max(defaultParcelLimits.maxLengthCm),
  widthCm: z.coerce.number().int().positive().max(defaultParcelLimits.maxWidthCm),
  heightCm: z.coerce.number().int().positive().max(defaultParcelLimits.maxHeightCm),
  declaredValueMinor: z.coerce
    .bigint()
    .nonnegative()
    .max(BigInt(defaultParcelLimits.maxDeclaredValueMinor)),
  senderName: textField.max(100),
  senderPhone: optionalTextField,
  recipientName: textField.max(100),
  recipientPhone: textField.max(40),
  pickupPointId: z.string().trim().min(1).optional().nullable(),
  destinationPickupPointId: z.string().trim().min(1).optional().nullable(),
  pickupLabel: textField.max(160),
  destinationLabel: textField.max(160),
  senderComment: z.string().trim().max(500).optional().nullable(),
  recipientComment: z.string().trim().max(500).optional().nullable(),
  contentDeclarationAccepted: z.boolean().optional(),
  packagingDeclarationAccepted: z.boolean().optional(),
});

export const parcelSubmitSchema = z.object({
  contentDeclarationAccepted: z.literal(true),
  packagingDeclarationAccepted: z.literal(true),
});

export const parcelReasonSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
});

export const parcelCodeVerifySchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{4,6}$/),
});

export const parcelPhotoSchema = z.object({
  type: z.enum(parcelAttachmentTypes).default("OTHER"),
  originalFileName: textField.max(180),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.coerce
    .number()
    .int()
    .positive()
    .max(8 * 1024 * 1024),
  checksum: z.string().trim().min(16).max(128),
  storageKey: z.string().trim().min(16).max(300),
});

export type ParcelStatus = (typeof parcelStatuses)[number];
export type ParcelAction =
  | "SUBMIT"
  | "DRIVER_ACCEPT"
  | "DRIVER_REJECT"
  | "HANDOVER"
  | "START_TRANSIT"
  | "READY_FOR_PICKUP"
  | "DELIVER"
  | "CANCEL_SENDER"
  | "CANCEL_DRIVER"
  | "CANCEL_ADMIN"
  | "MARK_LOST"
  | "MARK_DAMAGED"
  | "DISPUTE"
  | "EXPIRE";

const parcelTransitionTargets = {
  SUBMIT: "ACCEPTED",
  DRIVER_ACCEPT: "ACCEPTED",
  DRIVER_REJECT: "REJECTED",
  HANDOVER: "HANDED_TO_DRIVER",
  START_TRANSIT: "IN_TRANSIT",
  READY_FOR_PICKUP: "READY_FOR_PICKUP",
  DELIVER: "DELIVERED",
  CANCEL_SENDER: "CANCELLED_BY_SENDER",
  CANCEL_DRIVER: "CANCELLED_BY_DRIVER",
  CANCEL_ADMIN: "CANCELLED_BY_ADMIN",
  MARK_LOST: "LOST",
  MARK_DAMAGED: "DAMAGED",
  DISPUTE: "DISPUTED",
  EXPIRE: "EXPIRED",
} as const satisfies Record<ParcelAction, ParcelStatus>;

const parcelAllowedTransitions = {
  SUBMIT: ["DRAFT", "CREATED"],
  DRIVER_ACCEPT: ["PENDING_DRIVER_ACCEPTANCE"],
  DRIVER_REJECT: ["PENDING_DRIVER_ACCEPTANCE", "CREATED"],
  HANDOVER: ["ACCEPTED"],
  START_TRANSIT: ["HANDED_TO_DRIVER"],
  READY_FOR_PICKUP: ["IN_TRANSIT"],
  DELIVER: ["READY_FOR_PICKUP"],
  CANCEL_SENDER: ["DRAFT", "CREATED", "PENDING_DRIVER_ACCEPTANCE", "ACCEPTED"],
  CANCEL_DRIVER: ["PENDING_DRIVER_ACCEPTANCE", "ACCEPTED"],
  CANCEL_ADMIN: [
    "DRAFT",
    "CREATED",
    "PENDING_DRIVER_ACCEPTANCE",
    "ACCEPTED",
    "HANDED_TO_DRIVER",
    "IN_TRANSIT",
    "READY_FOR_PICKUP",
  ],
  MARK_LOST: ["HANDED_TO_DRIVER", "IN_TRANSIT", "READY_FOR_PICKUP"],
  MARK_DAMAGED: ["HANDED_TO_DRIVER", "IN_TRANSIT", "READY_FOR_PICKUP"],
  DISPUTE: ["READY_FOR_PICKUP", "DELIVERED", "DAMAGED", "LOST"],
  EXPIRE: ["DRAFT", "CREATED", "PENDING_DRIVER_ACCEPTANCE", "ACCEPTED"],
} as const satisfies Record<ParcelAction, readonly ParcelStatus[]>;

export function evaluateParcelTransition(currentStatus: ParcelStatus, action: ParcelAction) {
  const toStatus = parcelTransitionTargets[action];
  if (currentStatus === toStatus) return { ok: true, toStatus, idempotent: true } as const;
  const allowed: readonly ParcelStatus[] = parcelAllowedTransitions[action];
  if (!allowed.includes(currentStatus)) {
    return {
      ok: false,
      code: "PARCEL_INVALID_TRANSITION",
      message: `${currentStatus} cannot transition via ${action}`,
    } as const;
  }
  return { ok: true, toStatus, idempotent: false } as const;
}

export function calculateParcelPriceMinor(input: {
  baseParcelPriceMinor?: bigint | null;
  weightGrams: number;
}) {
  const base = input.baseParcelPriceMinor ?? 25_000_00n;
  const overweightSteps = Math.max(0, Math.ceil((input.weightGrams - 5_000) / 5_000));
  return base + BigInt(overweightSteps) * 5_000_00n;
}

export function parcelCodeCanAttempt(input: {
  status: string;
  expiresAt: Date;
  attemptsCount: number;
  maxAttempts: number;
  lockedAt?: Date | null;
  verifiedAt?: Date | null;
  now?: Date;
}) {
  if (input.status !== "ACTIVE") return { ok: false, code: "PARCEL_CODE_INACTIVE" };
  if (input.verifiedAt) return { ok: false, code: "PARCEL_CODE_USED" };
  if (input.lockedAt) return { ok: false, code: "PARCEL_CODE_LOCKED" };
  if (input.expiresAt.getTime() <= (input.now ?? new Date()).getTime()) {
    return { ok: false, code: "PARCEL_CODE_EXPIRED" };
  }
  if (input.attemptsCount >= input.maxAttempts) {
    return { ok: false, code: "PARCEL_CODE_MAX_ATTEMPTS" };
  }
  return { ok: true, code: "PARCEL_CODE_ATTEMPT_ALLOWED" };
}

export const conversationTypes = [
  "BOOKING",
  "PARCEL",
  "SUPPORT_ESCALATION",
  "SYSTEM_ONLY",
] as const;
export const chatMessageTypes = ["TEXT", "IMAGE", "LOCATION", "SYSTEM", "VOICE", "FILE"] as const;
export const messageReceiptStatuses = ["SENT", "DELIVERED", "READ"] as const;
export const notificationTypes = [
  "BOOKING_CONFIRMED",
  "BOOKING_REJECTED",
  "BOOKING_CANCELLED",
  "BOARDING_STARTED",
  "BOARDING_CONFIRMED",
  "TRIP_STARTED",
  "TRIP_COMPLETED",
  "PARCEL_ACCEPTED",
  "PARCEL_REJECTED",
  "PARCEL_HANDED_OVER",
  "PARCEL_IN_TRANSIT",
  "PARCEL_READY",
  "PARCEL_DELIVERED",
  "PARCEL_ISSUE",
  "CHAT_MESSAGE",
  "SUPPORT_TICKET_UPDATED",
  "REVIEW_AVAILABLE",
  "REVIEW_RECEIVED",
  "REVIEW_REPORTED",
  "REVIEW_MODERATED",
  "SAFETY_REPORT_SUBMITTED",
  "SAFETY_REPORT_UPDATED",
  "SAFETY_REPORT_RESOLVED",
  "SAFETY_ALERT",
  "RESTRICTION_APPLIED",
  "RESTRICTION_EXPIRING",
  "RESTRICTION_REMOVED",
  "TRIP_SHARE_CREATED",
  "TRIP_SHARE_EXPIRING",
  "TRUSTED_CONTACT_ADDED",
  "RELIABILITY_LEVEL_CHANGED",
  "SYSTEM_ANNOUNCEMENT",
] as const;
export const notificationChannels = ["IN_APP", "TELEGRAM", "EMAIL", "SMS"] as const;
export const supportTicketTypes = [
  "BOOKING",
  "TRIP",
  "PARCEL",
  "PAYMENT_PLACEHOLDER",
  "ACCOUNT",
  "DRIVER_VERIFICATION",
  "VEHICLE",
  "SAFETY",
  "OTHER",
] as const;
export const supportTicketStatuses = [
  "NEW",
  "IN_PROGRESS",
  "WAITING_FOR_USER",
  "UNDER_REVIEW",
  "RESOLVED",
  "CLOSED",
  "REJECTED",
] as const;
export const supportPriorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export const supportRequesterRoles = ["CLIENT", "DRIVER"] as const;
export const supportAttachmentMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "application/pdf",
  "text/plain",
] as const;
export const supportAttachmentMaxSizeBytes = 20 * 1024 * 1024;

export const defaultChatLimits = {
  maxTextLength: 2000,
  editWindowMinutes: 15,
  deleteWindowMinutes: 30,
  retentionDays: 30,
} as const;

export const createConversationSchema = z
  .object({
    bookingId: z.string().trim().min(1).optional(),
    parcelOrderId: z.string().trim().min(1).optional(),
  })
  .refine((value) => Boolean(value.bookingId) !== Boolean(value.parcelOrderId), {
    message: "Exactly one conversation entity is required",
  });

export const chatMessageSchema = z
  .object({
    clientMessageId: z.string().trim().min(1).max(120),
    type: z.enum(chatMessageTypes).default("TEXT"),
    text: z.string().trim().max(defaultChatLimits.maxTextLength).optional().nullable(),
    locationLat: z.coerce.number().min(-90).max(90).optional().nullable(),
    locationLng: z.coerce.number().min(-180).max(180).optional().nullable(),
    locationLabel: z.string().trim().max(160).optional().nullable(),
    replyToMessageId: z.string().trim().min(1).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "TEXT" && !value.text) {
      ctx.addIssue({ code: "custom", path: ["text"], message: "Text message cannot be empty" });
    }
    if (value.type === "LOCATION" && (value.locationLat == null || value.locationLng == null)) {
      ctx.addIssue({
        code: "custom",
        path: ["locationLat"],
        message: "Location messages require coordinates",
      });
    }
    if (value.type === "VOICE") {
      ctx.addIssue({ code: "custom", path: ["type"], message: "Voice messages are not enabled" });
    }
  });

export const chatMessageEditSchema = z.object({
  text: z.string().trim().min(1).max(defaultChatLimits.maxTextLength),
});

export const messageReportSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
});

export const notificationCreateSchema = z.object({
  recipientUserId: z.string().trim().min(1),
  type: z.enum(notificationTypes),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(1000),
  entityType: z.string().trim().max(80).optional().nullable(),
  entityId: z.string().trim().max(120).optional().nullable(),
  deepLink: z.string().trim().max(300).optional().nullable(),
  deduplicationKey: z.string().trim().min(1).max(200),
});

export const supportTicketCreateSchema = z.object({
  type: z.enum(supportTicketTypes),
  subject: z.string().trim().min(3).max(160),
  description: z.string().trim().min(5).max(4000),
  priority: z.enum(supportPriorities).default("NORMAL"),
  bookingId: z.string().trim().min(1).optional().nullable(),
  tripId: z.string().trim().min(1).optional().nullable(),
  parcelOrderId: z.string().trim().min(1).optional().nullable(),
  requesterRole: z.enum(supportRequesterRoles).optional(),
});

export const supportTicketMessageSchema = z.object({
  text: z.string().trim().min(1).max(4000),
  replyToMessageId: z.string().trim().min(1).optional().nullable(),
});

export const supportAttachmentMetadataSchema = z.object({
  messageId: z.string().trim().min(1).optional().nullable(),
  fileObjectId: z.string().trim().min(1).optional().nullable(),
  storageKey: z.string().trim().min(3).max(500).optional().nullable(),
  originalFileName: z.string().trim().min(1).max(240),
  mimeType: z.enum(supportAttachmentMimeTypes),
  sizeBytes: z.coerce.number().int().positive().max(supportAttachmentMaxSizeBytes),
  checksum: z.string().trim().min(8).max(160),
});

export const supportTicketStatusSchema = z.object({
  status: z.enum(supportTicketStatuses),
  reason: z.string().trim().max(1000).optional(),
});

export const supportAssignmentSchema = z.object({
  assigneeUserId: z.string().trim().min(1).optional().nullable(),
  reason: z.string().trim().max(1000).optional(),
});

export type BookingChatStatus = "CONFIRMED" | "BOARDING" | "IN_PROGRESS" | "COMPLETED" | string;
export type ParcelChatStatus = ParcelStatus;
export type SupportTicketStatus = (typeof supportTicketStatuses)[number];
export type SupportAction =
  | "START_PROGRESS"
  | "WAIT_FOR_USER"
  | "USER_REPLY"
  | "REVIEW"
  | "RESOLVE"
  | "CLOSE"
  | "REJECT"
  | "REOPEN";

export function bookingChatEligible(
  status: BookingChatStatus,
  retentionUntil?: Date | null,
  now = new Date(),
) {
  if (["CONFIRMED", "BOARDING", "IN_PROGRESS"].includes(status)) return true;
  return status === "COMPLETED" && Boolean(retentionUntil && retentionUntil > now);
}

export function parcelChatEligible(
  status: ParcelChatStatus,
  retentionUntil?: Date | null,
  now = new Date(),
) {
  if (["ACCEPTED", "HANDED_TO_DRIVER", "IN_TRANSIT", "READY_FOR_PICKUP"].includes(status)) {
    return true;
  }
  return status === "DELIVERED" && Boolean(retentionUntil && retentionUntil > now);
}

const supportTransitionTargets = {
  START_PROGRESS: "IN_PROGRESS",
  WAIT_FOR_USER: "WAITING_FOR_USER",
  USER_REPLY: "IN_PROGRESS",
  REVIEW: "UNDER_REVIEW",
  RESOLVE: "RESOLVED",
  CLOSE: "CLOSED",
  REJECT: "REJECTED",
  REOPEN: "IN_PROGRESS",
} as const satisfies Record<SupportAction, SupportTicketStatus>;

const supportAllowedTransitions = {
  START_PROGRESS: ["NEW", "WAITING_FOR_USER", "UNDER_REVIEW"],
  WAIT_FOR_USER: ["NEW", "IN_PROGRESS", "UNDER_REVIEW"],
  USER_REPLY: ["WAITING_FOR_USER"],
  REVIEW: ["NEW", "IN_PROGRESS"],
  RESOLVE: ["IN_PROGRESS", "UNDER_REVIEW", "WAITING_FOR_USER"],
  CLOSE: ["RESOLVED", "REJECTED"],
  REJECT: ["NEW", "IN_PROGRESS", "UNDER_REVIEW"],
  REOPEN: ["RESOLVED", "CLOSED"],
} as const satisfies Record<SupportAction, readonly SupportTicketStatus[]>;

export function evaluateSupportTransition(
  currentStatus: SupportTicketStatus,
  action: SupportAction,
) {
  const toStatus = supportTransitionTargets[action];
  if (currentStatus === toStatus) return { ok: true, toStatus, idempotent: true } as const;
  const allowed: readonly SupportTicketStatus[] = supportAllowedTransitions[action];
  if (!allowed.includes(currentStatus)) {
    return {
      ok: false,
      code: "SUPPORT_INVALID_TRANSITION",
      message: `${currentStatus} cannot transition via ${action}`,
    } as const;
  }
  return { ok: true, toStatus, idempotent: false } as const;
}

export function calculateSlaDueAt(priority: (typeof supportPriorities)[number], now = new Date()) {
  const minutes =
    priority === "URGENT" ? 30 : priority === "HIGH" ? 120 : priority === "LOW" ? 1440 : 480;
  return new Date(now.getTime() + minutes * 60_000);
}

export const reviewTypes = [
  "DRIVER_BY_CLIENT",
  "CLIENT_BY_DRIVER",
  "PARCEL_DRIVER_BY_SENDER",
  "PARCEL_SENDER_BY_DRIVER",
] as const;
export const reviewStatuses = [
  "DRAFT",
  "PUBLISHED",
  "HIDDEN",
  "UNDER_REVIEW",
  "REJECTED",
  "DELETED_BY_AUTHOR",
  "REMOVED_BY_ADMIN",
] as const;
export const reviewCriterionCodes = [
  "SAFETY",
  "DRIVING_QUALITY",
  "POLITENESS",
  "PUNCTUALITY",
  "VEHICLE_CLEANLINESS",
  "COMMUNICATION",
  "RESPECT_FOR_VEHICLE",
  "ACCURATE_INFORMATION",
  "PACKAGING",
  "CAREFUL_HANDLING",
] as const;
export const reliabilityLevels = [
  "NEW",
  "STANDARD",
  "RELIABLE",
  "HIGHLY_RELIABLE",
  "AT_RISK",
  "RESTRICTED",
] as const;
export const reliabilityEventTypes = [
  "TRIP_COMPLETED",
  "BOOKING_COMPLETED",
  "CLIENT_CANCELLED",
  "DRIVER_CANCELLED",
  "CLIENT_NO_SHOW",
  "DRIVER_NO_SHOW",
  "PARCEL_DELIVERED",
  "PARCEL_LOST",
  "PARCEL_DAMAGED",
  "SAFETY_REPORT_CONFIRMED",
  "RESTRICTION_APPLIED",
  "RESTRICTION_REMOVED",
] as const;
export const safetyReportTypes = [
  "UNSAFE_DRIVING",
  "HARASSMENT",
  "THREATS",
  "VIOLENCE",
  "DISCRIMINATION",
  "FRAUD",
  "IMPERSONATION",
  "DANGEROUS_VEHICLE",
  "INAPPROPRIATE_CONTENT",
  "PROHIBITED_PARCEL",
  "LOST_PARCEL",
  "DAMAGED_PARCEL",
  "PRIVACY_VIOLATION",
  "OTHER",
] as const;
export const safetyReportStatuses = [
  "SUBMITTED",
  "TRIAGED",
  "UNDER_REVIEW",
  "ACTION_REQUIRED",
  "RESOLVED",
  "REJECTED",
  "DUPLICATE",
  "CLOSED",
] as const;
export const safetySeverities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const accountRestrictionTypes = [
  "CHAT_RESTRICTED",
  "BOOKING_RESTRICTED",
  "DRIVER_TRIP_CREATION_RESTRICTED",
  "PARCEL_RESTRICTED",
  "TEMPORARY_SUSPENSION",
  "FULL_SUSPENSION",
] as const;
export const emergencyActionTypes = [
  "SOS_STARTED",
  "EMERGENCY_NUMBER_CALLED",
  "TRIP_SHARED",
  "SUPPORT_CONTACTED",
  "SAFETY_REPORT_CREATED",
  "DETAILS_COPIED",
] as const;

export const defaultTrustSafetyLimits = {
  reviewWindowDays: 30,
  reviewEditWindowDays: 14,
  maxReviewTextLength: 1200,
  maxSafetyDescriptionLength: 4000,
  maxTrustedContacts: 5,
  tripShareTtlHours: 48,
} as const;

export const reviewSchema = z.object({
  type: z.enum(reviewTypes),
  bookingId: z.string().trim().min(1).optional().nullable(),
  tripId: z.string().trim().min(1).optional().nullable(),
  parcelOrderId: z.string().trim().min(1).optional().nullable(),
  revieweeUserId: z.string().trim().min(1),
  overallRating: z.coerce.number().int().min(1).max(5),
  text: z.string().trim().max(defaultTrustSafetyLimits.maxReviewTextLength).optional().nullable(),
  criteria: z
    .array(
      z.object({
        code: z.enum(reviewCriterionCodes),
        score: z.coerce.number().int().min(1).max(5),
      }),
    )
    .default([]),
});

export const reviewEditSchema = z.object({
  overallRating: z.coerce.number().int().min(1).max(5).optional(),
  text: z.string().trim().max(defaultTrustSafetyLimits.maxReviewTextLength).optional().nullable(),
  criteria: z
    .array(
      z.object({
        code: z.enum(reviewCriterionCodes),
        score: z.coerce.number().int().min(1).max(5),
      }),
    )
    .optional(),
});

export const reviewReportSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
});

export const moderationReasonSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
});

export const userBlockSchema = z.object({
  reason: z.string().trim().max(500).optional().nullable(),
});

export const safetyReportSchema = z.object({
  reportedUserId: z.string().trim().min(1).optional().nullable(),
  tripId: z.string().trim().min(1).optional().nullable(),
  bookingId: z.string().trim().min(1).optional().nullable(),
  parcelOrderId: z.string().trim().min(1).optional().nullable(),
  conversationId: z.string().trim().min(1).optional().nullable(),
  messageId: z.string().trim().min(1).optional().nullable(),
  reviewId: z.string().trim().min(1).optional().nullable(),
  type: z.enum(safetyReportTypes),
  severity: z.enum(safetySeverities).default("MEDIUM"),
  description: z.string().trim().min(5).max(defaultTrustSafetyLimits.maxSafetyDescriptionLength),
});

export const safetyReportStatusSchema = z.object({
  status: z.enum(safetyReportStatuses),
  reason: z.string().trim().max(1000).optional(),
  resolutionCode: z.string().trim().max(80).optional(),
  resolutionSummary: z.string().trim().max(2000).optional(),
});

export const safetyAssignmentSchema = z.object({
  assigneeUserId: z.string().trim().min(1).optional().nullable(),
  reason: z.string().trim().max(1000).optional(),
});

export const safetyInternalNoteSchema = z.object({
  text: z.string().trim().min(1).max(4000),
});

export const trustedContactSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(6).max(40),
  relationship: z.string().trim().max(80).optional().nullable(),
});

export const tripShareCreateSchema = z.object({
  bookingId: z.string().trim().min(1).optional().nullable(),
  label: z.string().trim().max(120).optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
});

export const accountRestrictionSchema = z.object({
  type: z.enum(accountRestrictionTypes),
  reason: z.string().trim().min(3).max(1000),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional().nullable(),
});

export const restrictionRevokeSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
});

export const emergencyActionSchema = z.object({
  type: z.enum(emergencyActionTypes),
  tripId: z.string().trim().min(1).optional().nullable(),
  bookingId: z.string().trim().min(1).optional().nullable(),
  parcelOrderId: z.string().trim().min(1).optional().nullable(),
  safetyReportId: z.string().trim().min(1).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ReviewType = (typeof reviewTypes)[number];
export type ReviewStatus = (typeof reviewStatuses)[number];
export type SafetyReportStatus = (typeof safetyReportStatuses)[number];
export type SafetyAction =
  | "TRIAGE"
  | "START_REVIEW"
  | "REQUEST_ACTION"
  | "RESOLVE"
  | "REJECT"
  | "DUPLICATE"
  | "CLOSE"
  | "REOPEN";

export function stripUnsafeReviewText(value?: string | null) {
  if (!value) return null;
  return (
    value
      .replace(/<[^>]*>/g, "")
      .replace(/javascript:/gi, "")
      .trim() || null
  );
}

export function reviewCriteriaForType(type: ReviewType) {
  if (type === "DRIVER_BY_CLIENT") {
    return [
      "SAFETY",
      "DRIVING_QUALITY",
      "POLITENESS",
      "PUNCTUALITY",
      "VEHICLE_CLEANLINESS",
      "COMMUNICATION",
    ] as const;
  }
  if (type === "CLIENT_BY_DRIVER") {
    return [
      "PUNCTUALITY",
      "POLITENESS",
      "COMMUNICATION",
      "RESPECT_FOR_VEHICLE",
      "ACCURATE_INFORMATION",
    ] as const;
  }
  return [
    "COMMUNICATION",
    "PACKAGING",
    "PUNCTUALITY",
    "CAREFUL_HANDLING",
    "ACCURATE_INFORMATION",
  ] as const;
}

export function reviewWindowOpen(
  completedAt: Date,
  now = new Date(),
  windowDays = defaultTrustSafetyLimits.reviewWindowDays,
) {
  return now.getTime() <= completedAt.getTime() + windowDays * 24 * 60 * 60 * 1000;
}

export function evaluateReviewEligibility(input: {
  type: ReviewType;
  reviewerUserId: string;
  revieweeUserId: string;
  entityStatus: string;
  reviewerParticipated: boolean;
  revieweeIsCounterpart: boolean;
  completedAt: Date;
  now?: Date;
}) {
  if (input.reviewerUserId === input.revieweeUserId) {
    return { ok: false, code: "REVIEW_SELF_FORBIDDEN", message: "Cannot review yourself" } as const;
  }
  const requiredStatus = input.type.startsWith("PARCEL") ? "DELIVERED" : "COMPLETED";
  if (input.entityStatus !== requiredStatus) {
    return {
      ok: false,
      code: "REVIEW_ENTITY_NOT_COMPLETED",
      message: "Entity is not eligible for review",
    } as const;
  }
  if (!input.reviewerParticipated || !input.revieweeIsCounterpart) {
    return {
      ok: false,
      code: "REVIEW_ENTITY_FORBIDDEN",
      message: "Reviewer is not allowed to review this entity",
    } as const;
  }
  if (!reviewWindowOpen(input.completedAt, input.now)) {
    return { ok: false, code: "REVIEW_WINDOW_CLOSED", message: "Review window is closed" } as const;
  }
  return { ok: true } as const;
}

export function calculateRatingAggregate(ratings: number[]) {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  for (const rating of ratings) {
    const key = Math.max(1, Math.min(5, Math.trunc(rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[key] += 1;
  }
  const ratingCount = ratings.length;
  const averageRating =
    ratingCount === 0 ? 0 : ratings.reduce((sum, value) => sum + value, 0) / ratingCount;
  return {
    averageRating: Math.round(averageRating * 100) / 100,
    ratingCount,
    ratingDistribution: distribution,
  };
}

export function calculateReliabilityLevel(input: {
  completedTripsCount?: number;
  completedBookingsCount?: number;
  clientCancellationCount?: number;
  driverCancellationCount?: number;
  clientNoShowCount?: number;
  driverNoShowCount?: number;
  parcelIssueCount?: number;
  accountRestrictionCount?: number;
}) {
  if ((input.accountRestrictionCount ?? 0) > 0) return "RESTRICTED" as const;
  const negative =
    (input.clientCancellationCount ?? 0) +
    (input.driverCancellationCount ?? 0) +
    (input.clientNoShowCount ?? 0) * 2 +
    (input.driverNoShowCount ?? 0) * 2 +
    (input.parcelIssueCount ?? 0) * 2;
  const completed = (input.completedTripsCount ?? 0) + (input.completedBookingsCount ?? 0);
  if (negative >= 4) return "AT_RISK" as const;
  if (completed >= 30 && negative <= 1) return "HIGHLY_RELIABLE" as const;
  if (completed >= 10 && negative <= 2) return "RELIABLE" as const;
  if (completed >= 2) return "STANDARD" as const;
  return "NEW" as const;
}

const safetyTransitionTargets = {
  TRIAGE: "TRIAGED",
  START_REVIEW: "UNDER_REVIEW",
  REQUEST_ACTION: "ACTION_REQUIRED",
  RESOLVE: "RESOLVED",
  REJECT: "REJECTED",
  DUPLICATE: "DUPLICATE",
  CLOSE: "CLOSED",
  REOPEN: "UNDER_REVIEW",
} as const satisfies Record<SafetyAction, SafetyReportStatus>;

const safetyAllowedTransitions = {
  TRIAGE: ["SUBMITTED"],
  START_REVIEW: ["SUBMITTED", "TRIAGED", "ACTION_REQUIRED"],
  REQUEST_ACTION: ["TRIAGED", "UNDER_REVIEW"],
  RESOLVE: ["TRIAGED", "UNDER_REVIEW", "ACTION_REQUIRED"],
  REJECT: ["TRIAGED", "UNDER_REVIEW"],
  DUPLICATE: ["SUBMITTED", "TRIAGED", "UNDER_REVIEW"],
  CLOSE: ["RESOLVED", "REJECTED", "DUPLICATE"],
  REOPEN: ["RESOLVED", "REJECTED", "CLOSED"],
} as const satisfies Record<SafetyAction, readonly SafetyReportStatus[]>;

export function evaluateSafetyTransition(currentStatus: SafetyReportStatus, action: SafetyAction) {
  const toStatus = safetyTransitionTargets[action];
  if (currentStatus === toStatus) return { ok: true, toStatus, idempotent: true } as const;
  const allowed: readonly SafetyReportStatus[] = safetyAllowedTransitions[action];
  if (!allowed.includes(currentStatus)) {
    return {
      ok: false,
      code: "SAFETY_REPORT_INVALID_TRANSITION",
      message: `${currentStatus} cannot transition via ${action}`,
    } as const;
  }
  return { ok: true, toStatus, idempotent: false } as const;
}

export function canCreateUserBlock(blockerUserId: string, blockedUserId: string) {
  if (blockerUserId === blockedUserId) {
    return {
      ok: false,
      code: "USER_BLOCK_SELF_FORBIDDEN",
      message: "Cannot block yourself",
    } as const;
  }
  return { ok: true } as const;
}

export function hashableTripShareToken(token: string) {
  return token.trim();
}

export const paymentMethods = [
  "CASH",
  "ONLINE",
  "WALLET",
  "BANK_TRANSFER",
  "MANUAL_TRANSFER",
] as const;
export const paymentProviders = ["MOCK", "MANUAL"] as const;
export const paymentTargetTypes = [
  "BOOKING",
  "PARCEL_ORDER",
  "DRIVER_PAYOUT",
  "ADJUSTMENT",
] as const;
export const paymentStatuses = [
  "CREATED",
  "REQUIRES_ACTION",
  "PROCESSING",
  "AUTHORIZED",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "EXPIRED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
] as const;
export const paymentIntentStatuses = [
  "CREATED",
  "PENDING",
  "REQUIRES_ACTION",
  "PROCESSING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "EXPIRED",
] as const;
export const refundReasons = [
  "CLIENT_CANCELLATION",
  "DRIVER_CANCELLATION",
  "ADMIN_CANCELLATION",
  "TRIP_CANCELLED",
  "DRIVER_NO_SHOW",
  "DUPLICATE_PAYMENT",
  "PARCEL_REJECTED",
  "PARCEL_CANCELLED",
  "SERVICE_NOT_DELIVERED",
  "MANUAL_ADJUSTMENT",
  "OTHER",
] as const;

export const paymentIntentCreateSchema = z.object({
  targetType: z.enum(["BOOKING", "PARCEL_ORDER"]),
  targetId: z.string().min(1),
  method: z.enum(["CASH", "ONLINE"]),
  provider: z.enum(paymentProviders).default("MOCK"),
});

export const paymentStatusQuerySchema = z.object({
  paymentId: z.string().min(1),
});

export const mockWebhookSchema = z.object({
  eventId: z.string().min(1),
  providerReference: z.string().min(1),
  status: z.enum(paymentIntentStatuses).default("SUCCEEDED"),
  amountMinor: z.union([z.string(), z.number(), z.bigint()]),
  currency: z.literal("UZS"),
});

export const refundRequestSchema = z.object({
  paymentId: z.string().min(1),
  reason: z.enum(refundReasons),
  amountMinor: z.union([z.string(), z.number(), z.bigint()]).optional(),
});

export const cashConfirmationSchema = z.object({
  paymentId: z.string().min(1),
  received: z.boolean(),
  reason: z.string().max(500).optional(),
});

export const payoutCreateSchema = z.object({
  driverProfileId: z.string().min(1),
  earningIds: z.array(z.string().min(1)).min(1),
});

export const payoutStatusSchema = z.object({
  status: z.enum(["PAID", "FAILED", "CANCELLED", "ON_HOLD"]),
  reason: z.string().max(500).optional(),
});

export const reconciliationRunSchema = z.object({
  provider: z.enum(paymentProviders),
  from: z.coerce.date(),
  to: z.coerce.date(),
});

export const analyticsEventSchema = z.object({
  type: z.enum([
    "SEARCH_PERFORMED",
    "TRIP_VIEWED",
    "BOOKING_STARTED",
    "PAYMENT_INTENT_CREATED",
    "PAYMENT_SUCCEEDED",
    "PAYMENT_FAILED",
    "REFUND_REQUESTED",
    "REFUND_SUCCEEDED",
    "PARCEL_CREATED",
    "SUPPORT_TICKET_CREATED",
    "SAFETY_REPORT_CREATED",
    "REVIEW_SUBMITTED",
  ]),
  entityType: z.string().max(80).optional(),
  entityId: z.string().max(120).optional(),
  sessionId: z.string().max(120).optional(),
  dedupeKey: z.string().max(160).optional(),
  payload: z
    .record(z.string(), z.unknown())
    .optional()
    .superRefine((payload, ctx) => {
      if (!payload) return;
      const unsafeKey = findUnsafeAnalyticsKey(payload);
      if (unsafeKey) {
        ctx.addIssue({
          code: "custom",
          message: `Analytics payload contains unsafe PII key: ${unsafeKey}`,
        });
      }
    }),
});

export type PaymentMethod = (typeof paymentMethods)[number];
export type PaymentProvider = (typeof paymentProviders)[number];
export type PaymentTargetType = (typeof paymentTargetTypes)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];
export type PaymentIntentStatus = (typeof paymentIntentStatuses)[number];
export type RefundReason = (typeof refundReasons)[number];

export function normalizeMinorUnit(value: string | number | bigint) {
  const normalized = BigInt(value);
  if (normalized < 0n) throw new Error("Amount must not be negative");
  return normalized;
}

export function requireReasonForFinancialAdminAction(reason: string | null | undefined) {
  if (!reason?.trim()) {
    return { ok: false, code: "FINANCIAL_REASON_REQUIRED", message: "Reason is required" } as const;
  }
  return { ok: true } as const;
}

export function safePaymentStatusForPublic(status: PaymentStatus) {
  if (status === "AUTHORIZED") return "PROCESSING" as const;
  return status;
}

export function providerAllowedInProduction(provider: PaymentProvider, production: boolean) {
  if (production && provider === "MOCK") {
    return {
      ok: false,
      code: "MOCK_PROVIDER_DISABLED_IN_PRODUCTION",
      message: "Mock payment provider cannot be used in production",
    } as const;
  }
  return { ok: true } as const;
}

function findUnsafeAnalyticsKey(payload: Record<string, unknown>, prefix = ""): string | null {
  for (const [key, value] of Object.entries(payload)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (
      /phone|telegram|chat(text|message)?|support(description|body)?|message(text|body)?/i.test(key)
    ) {
      return path;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = findUnsafeAnalyticsKey(value as Record<string, unknown>, path);
      if (nested) return nested;
    }
  }
  return null;
}

export const rewardStatuses = [
  "PENDING",
  "CONFIRMED",
  "REJECTED",
  "REVOKED",
  "PENDING_REVIEW",
] as const;
export const rewardTypes = [
  "CLIENT_TRIP_TICKET",
  "DRIVER_TRIP_TICKET",
  "CLIENT_REFERRAL_TICKET",
  "DRIVER_REFERRAL_TICKET",
  "DRIVER_MILESTONE_BONUS",
  "MANUAL_ADMIN_ADJUSTMENT",
] as const;
export const rewardSourceTypes = ["TRIP", "BOOKING", "REFERRAL", "MILESTONE", "ADMIN"] as const;
export const rewardRiskLevels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const fraudEvaluationStatuses = [
  "AUTO_APPROVED",
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
] as const;
export const referralStatuses = [
  "INVITED",
  "REGISTERED",
  "QUALIFIED",
  "REWARDED",
  "REJECTED",
] as const;

export const rewardConfigSchema = z.object({
  clientTripTickets: z.coerce.number().int().positive().default(1),
  driverTripTickets: z.coerce.number().int().positive().default(1),
  clientReferralTickets: z.coerce.number().int().positive().default(1),
  driverReferralTickets: z.coerce.number().int().positive().default(1),
  milestoneTargetCount: z.coerce.number().int().positive().default(50),
  milestoneRewardValue: z.coerce.number().int().nonnegative().default(20000000),
  minTripDurationMinutes: z.coerce.number().int().positive().default(20),
  minMovementMeters: z.coerce.number().int().nonnegative().default(500),
  mediumReviewThreshold: z.coerce.number().int().nonnegative().default(2),
  highReviewThreshold: z.coerce.number().int().nonnegative().default(3),
});

export const rewardReviewDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().min(3).max(1000),
});

export const referralCreateSchema = z.object({
  referredUserId: z.string().trim().min(1),
  roleContext: z.enum(["CLIENT", "DRIVER"]).default("CLIENT"),
  code: z.string().trim().min(3).max(80).optional(),
});

export type RewardType = (typeof rewardTypes)[number];
export type RewardStatus = (typeof rewardStatuses)[number];
export type RewardRiskLevel = (typeof rewardRiskLevels)[number];
export type FraudEvaluationStatus = (typeof fraudEvaluationStatuses)[number];
export type RewardConfig = z.infer<typeof rewardConfigSchema>;

export type RewardFraudContext = {
  pinVerified: boolean;
  gpsPoints: Array<{ latitude: number; longitude: number; recordedAt: Date }>;
  tripStartedAt?: Date | null;
  tripCompletedAt?: Date | null;
  completedTripDurationMinutes?: number | null;
  repeatPairCompletedTrips?: number;
  referralSelf?: boolean;
  referralCycle?: boolean;
  duplicateReward?: boolean;
};

export function rewardStatusForFraudStatus(status: FraudEvaluationStatus): RewardStatus {
  if (status === "AUTO_APPROVED" || status === "APPROVED") return "CONFIRMED";
  if (status === "REJECTED") return "REJECTED";
  return "PENDING_REVIEW";
}

export function evaluateRewardFraud(
  context: RewardFraudContext,
  config: Partial<RewardConfig> = {},
): {
  riskLevel: RewardRiskLevel;
  status: FraudEvaluationStatus;
  score: number;
  reasons: string[];
  movementMeters: number;
} {
  const rules = rewardConfigSchema.parse(config);
  const reasons: string[] = [];
  if (context.duplicateReward) reasons.push("DUPLICATE_REWARD_SOURCE");
  if (!context.pinVerified) reasons.push("START_PIN_NOT_VERIFIED");
  if (context.gpsPoints.length === 0) reasons.push("NO_GPS_POINTS");
  const sortedPoints = [...context.gpsPoints].sort(
    (left, right) => left.recordedAt.getTime() - right.recordedAt.getTime(),
  );
  const movementMeters = sortedPoints.slice(1).reduce((total, point, index) => {
    const previous = sortedPoints[index]!;
    return (
      total +
      distanceMetersBetween(
        { lat: previous.latitude, lng: previous.longitude },
        { lat: point.latitude, lng: point.longitude },
      )
    );
  }, 0);
  if (context.gpsPoints.length > 0 && movementMeters < rules.minMovementMeters) {
    reasons.push("INSUFFICIENT_MOVEMENT");
  }
  const durationMinutes =
    context.completedTripDurationMinutes ??
    (context.tripStartedAt && context.tripCompletedAt
      ? (context.tripCompletedAt.getTime() - context.tripStartedAt.getTime()) / 60000
      : null);
  if (durationMinutes == null || durationMinutes < rules.minTripDurationMinutes) {
    reasons.push("ABNORMAL_TRIP_DURATION");
  }
  if (
    context.tripStartedAt &&
    context.tripCompletedAt &&
    context.tripStartedAt.getTime() >= context.tripCompletedAt.getTime()
  ) {
    reasons.push("TIMELINE_ORDER_INVALID");
  }
  if ((context.repeatPairCompletedTrips ?? 0) >= 10) reasons.push("REPEAT_PAIR_PATTERN");
  if (context.referralSelf) reasons.push("SELF_REFERRAL");
  if (context.referralCycle) reasons.push("REFERRAL_CYCLE");
  const score = reasons.length;
  if (context.duplicateReward || context.referralSelf || context.referralCycle) {
    return { riskLevel: "CRITICAL", status: "REJECTED", score, reasons, movementMeters };
  }
  if (score >= rules.highReviewThreshold) {
    return { riskLevel: "HIGH", status: "PENDING_REVIEW", score, reasons, movementMeters };
  }
  if (score >= rules.mediumReviewThreshold) {
    return { riskLevel: "MEDIUM", status: "PENDING_REVIEW", score, reasons, movementMeters };
  }
  return { riskLevel: "LOW", status: "AUTO_APPROVED", score, reasons, movementMeters };
}

export function calculateDriverMilestoneProgress(input: {
  qualifyingTrips: number;
  targetCount: number;
}) {
  const completed = Math.max(0, Math.floor(input.qualifyingTrips));
  const target = Math.max(1, Math.floor(input.targetCount));
  return {
    completed,
    target,
    remaining: Math.max(0, target - completed),
    reached: completed >= target,
  };
}

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
});

export const supportTicketMessageSchema = z.object({
  text: z.string().trim().min(1).max(4000),
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

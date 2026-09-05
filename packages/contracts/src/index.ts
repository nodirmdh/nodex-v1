export type LocaleCode = "ru" | "uz" | "kaa";
export type CurrencyCode = "UZS";

export type TripStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "BOOKING_OPEN"
  | "FULL"
  | "UNPUBLISHED"
  | "BOARDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED"
  | "BLOCKED";

export type TripTariff = "START" | "COMFORT" | "PREMIUM";

export type SeatStatus =
  | "AVAILABLE"
  | "HELD"
  | "BOOKED"
  | "PAID"
  | "OCCUPIED"
  | "BLOCKED"
  | "UNAVAILABLE";

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details: unknown[];
    requestId: string;
  };
}

export interface MetaResponse {
  service: "nodex-api";
  version: string;
  environment: string;
  locales: LocaleCode[];
  currency: CurrencyCode;
}

export type AppContext = "CLIENT_APP" | "DRIVER_APP" | "ADMIN_WEB" | "LOCAL_MOCK";
export type UserRoleCode = "CLIENT" | "DRIVER" | "ADMIN" | "SUPPORT";
export type UserStatus = "ACTIVE" | "BLOCKED" | "DELETED";
export type UserTheme = "SYSTEM" | "LIGHT" | "DARK" | "TELEGRAM";

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  user: CurrentUserResponse;
  roles: UserRoleCode[];
  profileCompletion: Record<string, unknown>;
  appContext: AppContext;
}

export interface CurrentUserResponse {
  id: string;
  status: UserStatus;
  roles: UserRoleCode[];
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  phone: string | null;
  locale: LocaleCode;
  theme: UserTheme;
  acceptedTermsAt: string | null;
  profileCompletion: Record<string, unknown>;
  clientProfile: unknown | null;
  driverProfile: unknown | null;
  createdAt: string;
  lastSeenAt: string | null;
}

export type DriverVerificationApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN"
  | "SUSPENDED";

export type DriverVerificationDocumentType =
  | "IDENTITY_FRONT"
  | "IDENTITY_BACK"
  | "DRIVER_LICENSE_FRONT"
  | "DRIVER_LICENSE_BACK"
  | "VEHICLE_REGISTRATION_FRONT"
  | "VEHICLE_REGISTRATION_BACK"
  | "DRIVER_SELFIE"
  | "DRIVER_WITH_LICENSE_SELFIE"
  | "VEHICLE_FRONT"
  | "VEHICLE_REAR"
  | "VEHICLE_LEFT"
  | "VEHICLE_RIGHT"
  | "VEHICLE_INTERIOR";

export type DriverVerificationDocumentStatus =
  | "UPLOADED"
  | "ACCEPTED"
  | "REJECTED"
  | "REPLACED"
  | "DELETED";

export type DriverVerificationReviewAction =
  | "START_REVIEW"
  | "APPROVE"
  | "REJECT"
  | "REQUEST_CHANGES"
  | "SUSPEND"
  | "RESTORE";

export type DriverVerificationReasonCode =
  | "DOCUMENT_UNREADABLE"
  | "DOCUMENT_EXPIRED"
  | "DOCUMENT_MISMATCH"
  | "SELFIE_MISMATCH"
  | "MISSING_DOCUMENT"
  | "INVALID_LICENSE_CATEGORY"
  | "INVALID_VEHICLE_DATA"
  | "VEHICLE_PHOTO_INCOMPLETE"
  | "DUPLICATE_DRIVER"
  | "FRAUD_SUSPECTED"
  | "OTHER";

export interface DriverVerificationCompletion {
  personalDataComplete: boolean;
  identityDocumentsComplete: boolean;
  driverLicenseComplete: boolean;
  vehicleDataComplete: boolean;
  vehiclePhotosComplete: boolean;
  consentsComplete: boolean;
  overallPercentage: number;
  canSubmit: boolean;
  missing: string[];
}

export type VehicleStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "ARCHIVED";

export type VehicleDocumentType =
  | "REGISTRATION_CERTIFICATE"
  | "INSURANCE"
  | "TECHNICAL_INSPECTION"
  | "OWNERSHIP_OR_USAGE_PROOF"
  | "OTHER";

export type VehiclePhotoType =
  | "FRONT"
  | "REAR"
  | "LEFT_SIDE"
  | "RIGHT_SIDE"
  | "INTERIOR_FRONT"
  | "INTERIOR_REAR"
  | "PLATE"
  | "OTHER";

export type VehicleModerationReasonCode =
  | "DOCUMENT_UNREADABLE"
  | "DOCUMENT_EXPIRED"
  | "DOCUMENT_MISMATCH"
  | "PHOTO_INCOMPLETE"
  | "PLATE_MISMATCH"
  | "INVALID_VEHICLE_DATA"
  | "DUPLICATE_PLATE"
  | "SAFETY_CONCERN"
  | "OTHER";

export interface VehicleCompletion {
  vehicleDataComplete: boolean;
  documentsComplete: boolean;
  photosComplete: boolean;
  canSubmit: boolean;
  missing: string[];
  overallPercentage: number;
}

export type PickupPointType =
  | "CITY_CENTER"
  | "BUS_STATION"
  | "RAILWAY_STATION"
  | "AIRPORT"
  | "CUSTOM";

export type TripStopType = "ORIGIN" | "INTERMEDIATE" | "DESTINATION";

export interface TripPublicationValidation {
  canPublish: boolean;
  errors: Array<{ code: string; field?: string; message: string }>;
}

export type TripSearchSort = "departure_asc" | "price_asc" | "price_desc" | "available_seats_desc";

export interface PublicCitySummary {
  id: string;
  code: string;
  nameRu: string;
  nameUz: string;
  nameKaa: string;
  timezone: string;
}

export interface PublicTripStop {
  id: string;
  city: PublicCitySummary;
  order: number;
  type: TripStopType;
  plannedAtUtc: string | null;
  label: string | null;
  address: string | null;
}

export interface PublicTripDriver {
  displayName: string;
  verified: boolean;
  reliabilityScore: number;
}

export interface PublicTripVehicle {
  make: string;
  model: string;
  year: number | null;
  color: string | null;
  bodyType: string | null;
  passengerSeatCount: number;
  amenities: unknown;
  verified: boolean;
}

export interface PublicTripDto {
  id: string;
  origin: PublicCitySummary | null;
  destination: PublicCitySummary | null;
  originCity: string;
  destinationCity: string;
  departureAtUtc: string;
  arrivalEstimateAtUtc: string | null;
  timezone: string;
  availableSeatCount: number;
  passengerSeatCapacity: number;
  pricePerSeatMinor: string;
  wholeCarPriceMinor: string | null;
  parcelSupported: boolean;
  parcelPriceMinor: string | null;
  currency: CurrencyCode;
  luggageRules: string | null;
  route: {
    id: string;
    distanceKm: number | null;
    estimatedDurationMinutes: number | null;
  } | null;
  stops: PublicTripStop[];
  driver: PublicTripDriver;
  vehicle: PublicTripVehicle;
}

export type BookingType = "SEAT" | "MULTI_SEAT" | "WHOLE_CAR";
export type BookingPreferenceType =
  | "CHILD"
  | "PET"
  | "ASSISTANCE"
  | "NO_SMOKING"
  | "STOP_ON_ROUTE"
  | "QUIET_RIDE";
export type BookingScheduleOption = "NOW" | "TODAY" | "TOMORROW" | "CUSTOM";
export type BookingBaggageType = "CABIN_BAG" | "SUITCASE" | "OVERSIZED" | "OTHER";

export interface BookingPreferencesDto {
  types: BookingPreferenceType[];
  driverComment: string | null;
}

export interface BookingPickupLocationDto {
  latitude: number | null;
  longitude: number | null;
  label: string | null;
  comment: string | null;
}

export interface BookingScheduleDto {
  option: BookingScheduleOption;
  requestedDepartureAtUtc: string | null;
}

export interface BookingBaggageDto {
  type: BookingBaggageType;
  quantity: number;
  weightKg?: number | null;
  notes?: string | null;
}

export interface BookingHoldRequestDto {
  tripId: string;
  type: BookingType;
  seatKeys: string[];
  passengerCount: number;
  pickupPointId?: string | null;
  destinationPickupPointId?: string | null;
  requestedDepartureAtUtc?: string | null;
  paymentMethod: "CASH" | "MANUAL_TRANSFER";
}

export interface BookingConfirmRequestDto {
  passengers: Array<{
    firstName: string;
    lastName?: string | null;
    phone?: string | null;
    ageCategory?: "ADULT" | "CHILD" | "INFANT";
    seatKey?: string | null;
    notes?: string | null;
  }>;
  baggage: BookingBaggageDto[];
  preferences: BookingPreferencesDto;
  pickupLocation?: BookingPickupLocationDto | null;
  schedule: BookingScheduleDto;
  clientComment?: string | null;
  consentAccepted: true;
  paymentMethod: "CASH" | "MANUAL_TRANSFER";
}
export interface TripSearchResponse {
  trips: PublicTripDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
}

export type TripLocationActorType = "DRIVER" | "PASSENGER";
export type TripLocationSource =
  | "PERIODIC"
  | "DRIVER_ARRIVED"
  | "PIN_VERIFIED"
  | "TRIP_STARTED"
  | "TRIP_COMPLETED"
  | "MANUAL"
  | "OTHER";

export interface TripStartPinDto {
  id: string;
  tripId: string;
  bookingId: string;
  pin?: string;
  status: string;
  codeLength: number;
  expiresAt: string;
  attemptsRemaining: number;
  lockedAt: string | null;
  verifiedAt: string | null;
}

export interface TripLocationPointDto {
  id: string;
  tripId: string;
  bookingId: string | null;
  actorType: TripLocationActorType;
  actorUserId: string | null;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  speedMetersPerSecond: number | null;
  headingDegrees: number | null;
  source: TripLocationSource;
  reason: string | null;
  recordedAt: string;
  createdAt: string;
}

export interface TripEtaSnapshotDto {
  driverEtaToPickupSeconds: number | null;
  driverEtaToDropoffSeconds: number | null;
  delaySeconds: number | null;
  status: "UNKNOWN" | "AVAILABLE" | "UNAVAILABLE";
  source: string;
  updatedAt?: string;
}

export interface TripLatestLocationDto {
  tripId: string;
  tripStatus: string | null;
  realtimeShared: boolean;
  driver: TripLocationPointDto | null;
  passenger: TripLocationPointDto | null;
  eta: TripEtaSnapshotDto;
}

export interface TripHistoryDto {
  tripId: string;
  status: string;
  timeline: unknown[];
  operations: unknown[];
  locations: TripLocationPointDto[];
  eta: TripEtaSnapshotDto;
}
export type RewardStatus = "PENDING" | "CONFIRMED" | "REJECTED" | "REVOKED" | "PENDING_REVIEW";
export type RewardRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type FraudEvaluationStatus = "AUTO_APPROVED" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
export type RewardRoleContext = "CLIENT" | "DRIVER";

export interface FraudEvaluationDto {
  riskLevel: RewardRiskLevel;
  status: FraudEvaluationStatus;
  score: number;
  reasons: unknown;
}

export interface RewardTransactionDto {
  id: string;
  userId: string;
  driverProfileId: string | null;
  roleContext: RewardRoleContext | string;
  type: string;
  amount: number;
  status: RewardStatus | string;
  sourceType: string;
  sourceId: string;
  reason: string | null;
  createdAt: string;
  confirmedAt: string | null;
  rejectedAt: string | null;
  reviewedAt: string | null;
  trip: {
    id: string;
    originCity: string;
    destinationCity: string;
    status: string;
  } | null;
  referral: {
    id: string;
    roleContext: string;
    status: string;
  } | null;
  fraud: FraudEvaluationDto | null;
}

export interface RewardSummaryDto {
  confirmed: number;
  pending: number;
  rejected: number;
}

export interface RewardsResponseDto {
  summary: RewardSummaryDto;
  rewards: RewardTransactionDto[];
  referrals: unknown[];
}

export interface DriverRewardsResponseDto {
  summary: RewardSummaryDto;
  rewards: RewardTransactionDto[];
  milestones: unknown[];
}

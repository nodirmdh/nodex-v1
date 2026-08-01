export type LocaleCode = "ru" | "uz" | "kaa";
export type CurrencyCode = "UZS";

export type TripStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "BOOKING_OPEN"
  | "FULL"
  | "BOARDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

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

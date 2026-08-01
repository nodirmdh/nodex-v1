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

const textField = z.string().trim().min(1).max(160);
const optionalTextField = z.string().trim().max(240).optional().nullable();
const dateField = z.coerce.date().optional().nullable();

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

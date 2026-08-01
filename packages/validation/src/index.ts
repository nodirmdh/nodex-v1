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

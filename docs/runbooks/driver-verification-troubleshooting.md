# Driver Verification Troubleshooting

## Draft Or Submit Fails

Check that the user authenticated with `DRIVER_APP`, has the `DRIVER` role, and owns a `DriverProfile`.

`DRIVER_VERIFICATION_INCOMPLETE` means backend completion found missing sections. Call `GET /api/v1/driver/verification/completion` for the server-side missing list.

## Upload Fails

Check:

- MIME type is one of the configured allowed values.
- File size is below `DRIVER_DOCUMENT_MAX_IMAGE_SIZE` or `DRIVER_DOCUMENT_MAX_PDF_SIZE`.
- Storage key belongs to the authenticated driver's current application.
- Application status is `DRAFT` or `CHANGES_REQUESTED`.

## Admin Decision Fails

Invalid transitions return `DRIVER_VERIFICATION_STATUS_INVALID`. Use explicit action endpoints only; do not patch status directly.

For `REJECT`, `REQUEST_CHANGES`, and `SUSPEND`, `reasonCode` is required. For `OTHER`, `comment` is also required.

## Production Checks

- Private driver document bucket exists.
- Directory listing is disabled.
- Signed URL TTL is short.
- API logs redact sensitive fields.
- MinIO/S3 credentials are not committed.
- Health endpoints return 200 after migration and seed.

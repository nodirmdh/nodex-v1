# Driver Document Security

Driver documents are sensitive personal data.

Controls:

- Documents are stored in private object storage, not PostgreSQL.
- API stores only metadata, checksum, MIME type, size, and storage key.
- Downloads are served through backend-authorized short-lived signed URLs.
- Drivers can read, upload, replace, or delete only their own editable application documents.
- Admin document access requires `ADMIN` and creates a `DRIVER_DOCUMENT_VIEWED` audit event.
- `CLIENT` and `SUPPORT` cannot access driver documents.
- List responses mask document numbers and sensitive identifiers.
- Logs must not contain full document numbers, addresses, signed URLs, storage keys, or binary content.

Allowed upload MIME types:

- `image/jpeg`
- `image/png`
- `image/webp`
- `application/pdf`

Local development uses mock signed URLs. Production must use private MinIO/S3 buckets with directory listing disabled, short TTL signed URLs, object lifecycle cleanup for orphan uploads, and infrastructure/database encryption. No OCR, automatic document recognition, or external KYC provider is used in Phase 2.

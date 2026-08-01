# Driver Verification API

Driver endpoints require `DRIVER` and operate on the authenticated driver's current application:

- `GET /api/v1/driver/verification`
- `POST /api/v1/driver/verification`
- `PATCH /api/v1/driver/verification`
- `POST /api/v1/driver/verification/submit`
- `POST /api/v1/driver/verification/withdraw`
- `GET /api/v1/driver/verification/history`
- `GET /api/v1/driver/verification/completion`
- `POST /api/v1/driver/verification/documents/presign`
- `POST /api/v1/driver/verification/documents/complete`
- `DELETE /api/v1/driver/verification/documents/:documentId`
- `POST /api/v1/driver/verification/documents/:documentId/replace`
- `GET /api/v1/driver/verification/documents/:documentId/download`

Admin endpoints require `ADMIN`:

- `GET /api/v1/admin/driver-verifications`
- `GET /api/v1/admin/driver-verifications/:applicationId`
- `POST /api/v1/admin/driver-verifications/:applicationId/start-review`
- `POST /api/v1/admin/driver-verifications/:applicationId/approve`
- `POST /api/v1/admin/driver-verifications/:applicationId/reject`
- `POST /api/v1/admin/driver-verifications/:applicationId/request-changes`
- `POST /api/v1/admin/driver-verifications/:applicationId/suspend`
- `POST /api/v1/admin/driver-verifications/:applicationId/restore`
- `GET /api/v1/admin/driver-verifications/:applicationId/history`
- `GET /api/v1/admin/driver-verifications/:applicationId/documents/:documentId`

Errors use the existing API envelope and Phase 2 codes such as `DRIVER_VERIFICATION_NOT_FOUND`, `DRIVER_VERIFICATION_INCOMPLETE`, `DRIVER_VERIFICATION_VERSION_CONFLICT`, `DRIVER_DOCUMENT_MIME_INVALID`, and `DRIVER_DOCUMENT_ACCESS_FORBIDDEN`.

# Vehicle Management API

Driver endpoints use the existing `/api/v1` prefix:

- `GET /vehicles`
- `POST /vehicles`
- `GET /vehicles/:vehicleId`
- `PATCH /vehicles/:vehicleId`
- `DELETE /vehicles/:vehicleId`
- `POST /vehicles/:vehicleId/submit`
- `POST /vehicles/:vehicleId/resubmit`
- `POST /vehicles/:vehicleId/set-primary`
- `POST /vehicles/:vehicleId/documents/presign`
- `POST /vehicles/:vehicleId/documents`
- `DELETE /vehicles/:vehicleId/documents/:documentId`
- `POST /vehicles/:vehicleId/photos/presign`
- `POST /vehicles/:vehicleId/photos`
- `DELETE /vehicles/:vehicleId/photos/:photoId`
- `GET /vehicles/:vehicleId/history`

Admin endpoints:

- `GET /admin/vehicles`
- `GET /admin/vehicles/:vehicleId`
- `GET /admin/vehicles/:vehicleId/history`
- `POST /admin/vehicles/:vehicleId/start-review`
- `POST /admin/vehicles/:vehicleId/approve`
- `POST /admin/vehicles/:vehicleId/request-changes`
- `POST /admin/vehicles/:vehicleId/reject`
- `POST /admin/vehicles/:vehicleId/suspend`
- `POST /admin/vehicles/:vehicleId/restore`

Reject, request changes, and suspend require a reason. `OTHER` requires a comment.

# API Error Format

All API errors use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Readable message",
    "details": [],
    "requestId": "..."
  }
}
```

Rules:

- `requestId` is also returned in `x-request-id`.
- Sensitive values such as Telegram initData, JWT, phone, and documents are never logged in clear text.
- Validation details must be structured arrays.

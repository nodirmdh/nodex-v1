# Final Acceptance Scenario Matrix

## Scenario A: Cash Passenger Ride

Status: partial.

Evidence: booking UI renders cash booking and client booking detail; Phase 7 trip operation suite passed boarding/start/complete/admin visibility. Combined all-suite run is state-sensitive because trip operation tests mutate shared booking status before Phase 6 UI assertions.

## Scenario B: Online Mock Ride

Status: partial.

Evidence: Phase 11 payment checkout UI, admin finance, analytics, and OpenAPI checks passed. Mock provider/webhook integrity was accepted in Phase 11 launch audit. Full end-to-end booking-to-webhook flow was not re-run as one isolated scenario in this pass.

## Scenario C: Online Payment Failure

Status: partial.

Evidence: worker finance maintenance processed expired payments and refunds in bounded startup logs. Dedicated isolated failed-payment UI flow remains recommended before launch.

## Scenario D: Refund

Status: partial.

Evidence: seeded refund and Phase 11 finance surfaces passed; worker finance maintenance processed refunds. Isolated refund journey should be replayed with fresh payment fixture before launch.

## Scenario E: Parcel

Status: passed for available smoke scope.

Evidence: Phase 8 API directory privacy, client parcel creation/tracking UI, driver parcel operations UI, and admin parcel moderation UI passed.

## Scenario F: Chat And Support

Status: passed for available smoke scope.

Evidence: Phase 9 conversation creation, idempotent message send, notifications read lifecycle, support ticket creation/admin history, and communication surfaces passed.

## Scenario G: Safety

Status: partial.

Evidence: review flow, admin trust/safety workspace, and client/driver/admin safety surfaces passed. Repeated trusted contact creation returned `409` in a reused local database, so isolated fixture reset is needed for a clean full replay.

## Scenario H: Admin Finance

Status: passed for available smoke scope.

Evidence: Phase 11 admin finance workspace, ledger entries, analytics dashboard, and OpenAPI finance/analytics paths passed.

## Negative Access

Status: partial.

Evidence: Phase 1 driver forbidden admin access passed in clean scope historically; Phase 2 client forbidden driver verification passed; Phase 11 payment integrity and duplicate guards were accepted in database/API launch audit. A full negative-access matrix should be run with isolated fixtures to avoid false positives from shared state.

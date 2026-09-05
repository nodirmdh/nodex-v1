# ENVO Trip Lifecycle

Verified locally on 2026-09-05 for `feat/support-safety`.

## Contract

Trip departure is stored as `departureAtUtc`; `timezone` defaults to `Asia/Tashkent`. A Trip belongs to one DriverProfile and one approved Vehicle. The backend stores passenger capacity, available seats, tariff, base seat price in UZS minor units, optional whole-car price and the parcel-enabled flag.

Tariffs are `START`, `COMFORT` and `PREMIUM`. Tariff is classification only: it does not calculate payment, commission or seat modifiers.

Vehicle ID plus `passengerSeatCount` is the stable layout identity/capacity contract. The backend creates stable seat keys at publish time; visual coordinates remain frontend-owned.

## Statuses and Transitions

| From | Action | To | Actor and guards |
| --- | --- | --- | --- |
| New | Create draft | `DRAFT` | Approved Driver; own approved active Vehicle |
| `DRAFT`, `UNPUBLISHED` | Update | same status | Approved owner; no active bookings for commercial fields |
| `DRAFT`, `UNPUBLISHED` | Publish | `PUBLISHED` | Approved owner/Vehicle; active route/cities; future departure; valid stops, capacity and positive price |
| `PUBLISHED` | Publish retry | `PUBLISHED` | Idempotent success |
| `PUBLISHED` | Unpublish | `UNPUBLISHED` | Approved owner |
| `PUBLISHED`, `BOOKING_OPEN`, `FULL` | Start boarding | `BOARDING` | Approved owner; operational transition guard |
| `BOARDING` | Start | `IN_PROGRESS` | Approved owner; passenger/PIN rules when bookings exist |
| `IN_PROGRESS` | Complete | `COMPLETED` | Approved owner |
| `DRAFT`, `UNPUBLISHED`, `PUBLISHED`, `BOOKING_OPEN`, `FULL`, `BOARDING` | Cancel | `CANCELLED` | Approved owner; reason required |
| `PUBLISHED`, `BOOKING_OPEN` | Expire | `EXPIRED` | Existing worker/system transition |
| Operational states | Block | `BLOCKED` | Existing Admin action |
| `BLOCKED` | Unblock | `PUBLISHED` | Existing Admin action |

`COMPLETED`, `EXPIRED`, `BLOCKED` and `IN_PROGRESS` cannot use the Driver pre-trip cancellation endpoint. Operational cancellation retains its existing narrower state machine.

## Data Guards

- Origin and destination must differ.
- A supplied departure must be in the future.
- Passenger capacity is 1-16 and cannot exceed the selected Vehicle capacity.
- Vehicle must belong to the authenticated Driver and be approved, active and not archived.
- Base seat price must be a positive integer-compatible minor-unit value; currency remains UZS.
- Public search/read exposes only future, available trips with approved Driver and Vehicle.
- Another Driver receives no access to read or mutate an owner's Trip.
- Client cannot create Driver Trips.

## Existing Hooks Preserved

- Create/update/publish/cancel write timeline and audit events.
- Publish creates seat inventory/snapshot, writes OutboxEvent, evaluates existing waitlist matching and favorite-driver notifications.
- Start boarding preserves boarding-code and Start PIN preparation.
- Start preserves parcel transit hooks and TripExecution timestamps.
- Complete preserves completion summary, reward qualification, referral/milestone and fraud-context evaluation hooks.
- Cancel preserves OutboxEvent; operational cancellation also retains booking/parcel/seat release hooks.

## Booking Dependency

Published trip commercial fields are not edited directly. Driver must unpublish first, and updates to departure, capacity, tariff, prices or parcel terms are blocked when active bookings exist. Precise amendment/refund/replacement behavior belongs to Booking Core and ENVO Protection, not Trips Core.

Vehicle overlap/availability scheduling beyond ownership and active approval is not implemented. Arrival estimation remains optional and map-provider integration remains separate.

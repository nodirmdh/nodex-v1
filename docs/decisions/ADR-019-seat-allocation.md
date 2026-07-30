# ADR-019: Seat Allocation Snapshot

Status: Accepted

Create `TripSeat` snapshots per trip and hold seats through `SeatHold` and `SeatHoldItem`.

Why: vehicle layout can change later, but each trip needs stable seat keys and price/status history. Holds remain server-side and can expire without trusting frontend state.

# ADR-018: Trip and TripExecution Separation

Status: Accepted

Separate planned supply (`Trip`) from operational runtime state (`TripExecution`).

Why: a scheduled trip can be edited, copied, cancelled, or archived independently from live execution events such as boarding, start, intermediate stops, and completion.

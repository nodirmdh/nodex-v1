# Realtime Foundation

Foundation does not implement production chat or live trip updates.

Architecture-ready decisions:

- API will expose WebSocket/Socket.IO gateway later.
- Chat and live trip events originate from domain events and outbox records.
- Clients must reconnect and refetch authoritative state after network loss.
- Mini Apps keep realtime modules lazy-loaded.

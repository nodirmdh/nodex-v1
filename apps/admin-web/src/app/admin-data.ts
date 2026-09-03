export type Tone = "neutral" | "success" | "warning" | "danger" | "info";

export type AdminUser = {
  id: string;
  name: string;
  telegram: string;
  phone: string;
  status: "Active" | "Watch" | "Blocked";
  trips: number;
  cancellations: number;
  rewards: string;
  risk: "Low" | "Medium" | "High";
  created: string;
  rating: string;
  referrals: number;
};

export type AdminDriver = {
  id: string;
  name: string;
  telegram: string;
  phone: string;
  vehicle: string;
  plate: string;
  status: "Active" | "Offline" | "Restricted";
  verification: "Approved" | "Pending" | "Needs action";
  trips: number;
  rating: string;
  cancellations: number;
  rewards: string;
  risk: "Low" | "Medium" | "High";
  city: string;
};

export type AdminTrip = {
  id: string;
  route: string;
  driverId: string;
  driver: string;
  departure: string;
  status: "Active" | "Boarding" | "Scheduled" | "Completed" | "Cancelled";
  seats: string;
  bookings: number;
  wholeCar: string;
  risk: "Low" | "Medium" | "High";
  startPin: "Ready" | "Pending" | "Used";
  eta: string;
};

export type AdminBooking = {
  id: string;
  clientId: string;
  client: string;
  tripId: string;
  trip: string;
  seats: string;
  baggage: string;
  wholeCar: string;
  status: "Pending" | "Accepted" | "Expired" | "Cancelled";
  requested: string;
  pickup: string;
  reward: string;
  risk: "Low" | "Medium" | "High";
};

export type SupportTicket = {
  id: string;
  requesterId: string;
  requester: string;
  tripId: string;
  bookingId: string;
  category: string;
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  priority: "Low" | "Normal" | "High" | "Urgent";
  updated: string;
  assigned: string;
  subject: string;
};

export type RewardItem = {
  id: string;
  ownerId: string;
  owner: string;
  role: "Client" | "Driver";
  source: string;
  tripId: string;
  status: "Pending" | "Approved" | "Rejected";
  amount: string;
  risk: "Low" | "Medium" | "High";
};

export type FraudCase = {
  id: string;
  entity: string;
  entityId: string;
  type: string;
  risk: "Low" | "Medium" | "High";
  flags: string;
  reason: string;
  tripId: string;
  status: "Open" | "Hold" | "Approved" | "Rejected";
  created: string;
};

export type Referral = {
  id: string;
  inviter: string;
  invited: string;
  qualifyingTrip: string;
  status: "Pending" | "Qualified" | "Blocked";
  reward: string;
  fraud: "Clear" | "Review" | "Blocked";
};

export const users: AdminUser[] = [
  { id: "usr_1024", name: "Dilshod Allamuratov", telegram: "@dilshod_a", phone: "+998 90 *** 1024", status: "Active", trips: 12, cancellations: 1, rewards: "8 400", risk: "Low", created: "2026-07-02", rating: "4.9", referrals: 3 },
  { id: "usr_1198", name: "Gulnoza Bektemirova", telegram: "@gulnoza_go", phone: "+998 91 *** 1198", status: "Watch", trips: 6, cancellations: 2, rewards: "3 200", risk: "Medium", created: "2026-07-11", rating: "4.7", referrals: 1 },
  { id: "usr_1307", name: "Murod Qodirov", telegram: "@murod_q", phone: "+998 93 *** 1307", status: "Active", trips: 21, cancellations: 0, rewards: "14 900", risk: "Low", created: "2026-06-28", rating: "5.0", referrals: 7 },
  { id: "usr_1440", name: "Kamila Sobirova", telegram: "@kamila_s", phone: "+998 97 *** 1440", status: "Blocked", trips: 2, cancellations: 3, rewards: "0", risk: "High", created: "2026-08-01", rating: "3.8", referrals: 0 },
];

export const drivers: AdminDriver[] = [
  { id: "drv_214", name: "Azizbek Karimov", telegram: "@aziz_driver", phone: "+998 90 *** 0214", vehicle: "Chevrolet Cobalt", plate: "95 A 214 QA", status: "Active", verification: "Approved", trips: 46, rating: "4.9", cancellations: 1, rewards: "18 200", risk: "Low", city: "Nukus" },
  { id: "drv_215", name: "Madina Yusupova", telegram: "@madina_route", phone: "+998 91 *** 0215", vehicle: "Chevrolet Tracker", plate: "95 B 412 QA", status: "Active", verification: "Pending", trips: 17, rating: "4.7", cancellations: 2, rewards: "7 100", risk: "Medium", city: "Urgench" },
  { id: "drv_318", name: "Sherzod Rakhimov", telegram: "@sherzod_trip", phone: "+998 93 *** 0318", vehicle: "Kia K5", plate: "95 C 118 QA", status: "Offline", verification: "Approved", trips: 33, rating: "4.8", cancellations: 0, rewards: "12 400", risk: "Low", city: "Tashkent" },
  { id: "drv_404", name: "Phase2 Driver 5", telegram: "@phase2_5", phone: "+998 94 *** 0404", vehicle: "Hyundai Elantra", plate: "95 D 404 QA", status: "Restricted", verification: "Needs action", trips: 4, rating: "4.3", cancellations: 4, rewards: "900", risk: "High", city: "Samarkand" },
];

export const trips: AdminTrip[] = [
  { id: "trip_7001", route: "Nukus -> Urgench", driverId: "drv_214", driver: "Azizbek Karimov", departure: "Today 18:30", status: "Boarding", seats: "3/4", bookings: 3, wholeCar: "No", risk: "Low", startPin: "Ready", eta: "1h 45m" },
  { id: "trip_7002", route: "Nukus -> Khiva", driverId: "drv_215", driver: "Madina Yusupova", departure: "Today 17:20", status: "Active", seats: "4/4", bookings: 4, wholeCar: "No", risk: "Medium", startPin: "Used", eta: "52m" },
  { id: "trip_7003", route: "Tashkent -> Samarkand", driverId: "drv_318", driver: "Sherzod Rakhimov", departure: "Tomorrow 07:40", status: "Scheduled", seats: "1/4", bookings: 1, wholeCar: "Requested", risk: "Low", startPin: "Pending", eta: "3h 10m" },
  { id: "trip_7004", route: "Urgench -> Nukus", driverId: "drv_404", driver: "Phase2 Driver 5", departure: "Yesterday 21:10", status: "Completed", seats: "2/4", bookings: 2, wholeCar: "No", risk: "High", startPin: "Used", eta: "Arrived" },
];

export const bookings: AdminBooking[] = [
  { id: "book_5001", clientId: "usr_1024", client: "Dilshod Allamuratov", tripId: "trip_7001", trip: "Nukus -> Urgench", seats: "Rear left", baggage: "Small bag", wholeCar: "No", status: "Pending", requested: "12:24", pickup: "Nukus station", reward: "Pending", risk: "Low" },
  { id: "book_5002", clientId: "usr_1198", client: "Gulnoza Bektemirova", tripId: "trip_7002", trip: "Nukus -> Khiva", seats: "Front", baggage: "None", wholeCar: "No", status: "Accepted", requested: "10:08", pickup: "Old town gate", reward: "Approved", risk: "Medium" },
  { id: "book_5003", clientId: "usr_1307", client: "Murod Qodirov", tripId: "trip_7003", trip: "Tashkent -> Samarkand", seats: "Whole car", baggage: "2 bags", wholeCar: "Yes", status: "Expired", requested: "Yesterday", pickup: "Metro Oybek", reward: "Rejected", risk: "Low" },
  { id: "book_5004", clientId: "usr_1440", client: "Kamila Sobirova", tripId: "trip_7004", trip: "Urgench -> Nukus", seats: "Rear right", baggage: "Medium", wholeCar: "No", status: "Cancelled", requested: "Yesterday", pickup: "Airport", reward: "Hold", risk: "High" },
];

export const tickets: SupportTicket[] = [
  { id: "sup_9001", requesterId: "usr_1024", requester: "Dilshod Allamuratov", tripId: "trip_7001", bookingId: "book_5001", category: "Booking", status: "Open", priority: "High", updated: "8 min ago", assigned: "Unassigned", subject: "Driver has not confirmed pickup" },
  { id: "sup_9002", requesterId: "drv_215", requester: "Madina Yusupova", tripId: "trip_7002", bookingId: "book_5002", category: "Safety", status: "In Progress", priority: "Urgent", updated: "22 min ago", assigned: "Amina", subject: "Passenger reported unsafe route change" },
  { id: "sup_9003", requesterId: "usr_1198", requester: "Gulnoza Bektemirova", tripId: "trip_7002", bookingId: "book_5002", category: "Rewards", status: "Resolved", priority: "Normal", updated: "1h ago", assigned: "Bek", subject: "Reward not visible after trip" },
  { id: "sup_9004", requesterId: "usr_1440", requester: "Kamila Sobirova", tripId: "trip_7004", bookingId: "book_5004", category: "Complaint", status: "Closed", priority: "Low", updated: "Yesterday", assigned: "Amina", subject: "Complaint archived" },
];

export const rewards: RewardItem[] = [
  { id: "rew_3001", ownerId: "usr_1024", owner: "Dilshod Allamuratov", role: "Client", source: "Completed trip", tripId: "trip_7001", status: "Pending", amount: "1 200", risk: "Low" },
  { id: "rew_3002", ownerId: "drv_214", owner: "Azizbek Karimov", role: "Driver", source: "Fill milestone", tripId: "trip_7001", status: "Approved", amount: "4 000", risk: "Low" },
  { id: "rew_3003", ownerId: "usr_1440", owner: "Kamila Sobirova", role: "Client", source: "Referral", tripId: "trip_7004", status: "Rejected", amount: "2 500", risk: "High" },
];

export const fraudCases: FraudCase[] = [
  { id: "fraud_8101", entity: "Reward", entityId: "rew_3003", type: "Referral loop", risk: "High", flags: "repeat pair, shared device", reason: "Referral and booking identities overlap", tripId: "trip_7004", status: "Open", created: "Today 09:12" },
  { id: "fraud_8102", entity: "Driver", entityId: "drv_215", type: "GPS mismatch", risk: "Medium", flags: "route drift", reason: "Reported pickup diverged from expected corridor", tripId: "trip_7002", status: "Hold", created: "Today 08:44" },
  { id: "fraud_8103", entity: "Booking", entityId: "book_5003", type: "Timeout abuse", risk: "Low", flags: "repeated expiry", reason: "Multiple whole-car requests expired", tripId: "trip_7003", status: "Approved", created: "Yesterday" },
];

export const referrals: Referral[] = [
  { id: "ref_1001", inviter: "Dilshod Allamuratov", invited: "Murod Qodirov", qualifyingTrip: "trip_7001", status: "Qualified", reward: "Approved", fraud: "Clear" },
  { id: "ref_1002", inviter: "Kamila Sobirova", invited: "Phase2 Driver 5", qualifyingTrip: "trip_7004", status: "Blocked", reward: "Rejected", fraud: "Blocked" },
  { id: "ref_1003", inviter: "Gulnoza Bektemirova", invited: "Madina Yusupova", qualifyingTrip: "trip_7002", status: "Pending", reward: "Pending", fraud: "Review" },
];

export const waitlists = [
  { id: "wait_6101", client: "Dilshod Allamuratov", route: "Nukus -> Urgench", status: "Matched", demand: "2 seats", match: "trip_7001" },
  { id: "wait_6102", client: "Gulnoza Bektemirova", route: "Nukus -> Khiva", status: "Active", demand: "1 front seat", match: "Searching" },
  { id: "wait_6103", client: "Murod Qodirov", route: "Tashkent -> Samarkand", status: "Expired", demand: "Whole car", match: "None" },
];

export function toneFor(value: string): Tone {
  if (["Active", "Approved", "Accepted", "Qualified", "Clear", "Low", "Ready", "Resolved", "Completed", "Matched"].includes(value)) return "success";
  if (["Pending", "Pending driver", "Watch", "Medium", "In Progress", "Hold", "Scheduled", "Boarding", "Review"].includes(value)) return "warning";
  if (["High", "Urgent", "Blocked", "Restricted", "Rejected", "Expired", "Cancelled", "Open"].includes(value)) return "danger";
  return "info";
}

export function userById(id: string) {
  return users.find((item) => item.id === id) ?? users[0]!;
}

export function driverById(id: string) {
  return drivers.find((item) => item.id === id) ?? drivers[0]!;
}

export function tripById(id: string) {
  return trips.find((item) => item.id === id) ?? trips[0]!;
}

export function bookingById(id: string) {
  return bookings.find((item) => item.id === id) ?? bookings[0]!;
}

export function ticketById(id: string) {
  return tickets.find((item) => item.id === id) ?? tickets[0]!;
}

export const globalSearchItems = [
  ...users.map((item) => ({ label: item.name, detail: `${item.telegram} · ${item.phone} · ${item.id}`, href: `/users/${item.id}` })),
  ...drivers.map((item) => ({ label: item.name, detail: `${item.plate} · ${item.phone} · ${item.id}`, href: `/drivers/${item.id}` })),
  ...trips.map((item) => ({ label: item.route, detail: `${item.id} · ${item.driver} · ${item.departure}`, href: `/trips/${item.id}` })),
  ...bookings.map((item) => ({ label: item.id, detail: `${item.client} · ${item.trip}`, href: `/bookings/${item.id}` })),
  ...tickets.map((item) => ({ label: item.id, detail: `${item.requester} · ${item.subject}`, href: `/support/${item.id}` })),
];
export type BookingType = "SEAT" | "MULTI_SEAT" | "WHOLE_CAR";
export type CabinTemplate = "SEDAN_5" | "SUV_5" | "SUV_7" | "MINIVAN_8";
export type SeatStatus = "available" | "selected" | "occupied" | "unavailable" | "driver";

export type CabinSeat = {
  key: string;
  label: string;
  row: "front" | "second" | "third";
  position: "left" | "center" | "right";
  status: Exclude<SeatStatus, "selected">;
};

export type TripCabin = {
  tripId: string;
  model: string;
  color: string;
  plate: string;
  capacity: string;
  tariff: string;
  route: string;
  departure: string;
  departureAtUtc: string;
  priceMinor: number;
  wholeCarPriceMinor: number;
  template: CabinTemplate;
};

export const tripCabin: TripCabin = {
  tripId: "phase5-nukus-urgench-morning",
  model: "Chevrolet Cobalt",
  color: "Белый",
  plate: "95 A 214 QA",
  capacity: "4 пассажирских места",
  tariff: "Комфорт",
  route: "Nukus → Urgench",
  departure: "08:30",
  departureAtUtc: "2026-09-03T03:30:00.000Z",
  priceMinor: 8500000,
  wholeCarPriceMinor: 39000000,
  template: "SEDAN_5",
};

export const cabinSeats: CabinSeat[] = [
  {
    key: "DRIVER",
    label: "Driver",
    row: "front",
    position: "left",
    status: "driver",
  },
  {
    key: "FRONT_RIGHT",
    label: "Front passenger",
    row: "front",
    position: "right",
    status: "available",
  },
  {
    key: "ROW_1_LEFT",
    label: "Rear left",
    row: "second",
    position: "left",
    status: "available",
  },
  {
    key: "ROW_1_CENTER",
    label: "Rear middle",
    row: "second",
    position: "center",
    status: "unavailable",
  },
  {
    key: "ROW_1_RIGHT",
    label: "Rear right",
    row: "second",
    position: "right",
    status: "occupied",
  },
];

export const sevenSeatPreview: CabinSeat[] = [
  ...cabinSeats.filter((seat) => seat.key !== "ROW_1_CENTER"),
  {
    key: "ROW_2_LEFT",
    label: "Third row left",
    row: "third",
    position: "left",
    status: "available",
  },
  {
    key: "ROW_2_CENTER",
    label: "Third row middle",
    row: "third",
    position: "center",
    status: "unavailable",
  },
  {
    key: "ROW_2_RIGHT",
    label: "Third row right",
    row: "third",
    position: "right",
    status: "available",
  },
];

export function selectableSeatKeys(seats: CabinSeat[]) {
  return seats.filter((seat) => seat.status === "available").map((seat) => seat.key);
}

export function seatLabelForKey(seats: CabinSeat[], seatKey: string) {
  return seats.find((seat) => seat.key === seatKey)?.label ?? seatKey;
}

export function cabinTemplateForModel(model: string, capacity: number): CabinTemplate {
  if (capacity >= 8) return "MINIVAN_8";
  if (capacity >= 7) return "SUV_7";
  if (/tracker|suv/i.test(model)) return "SUV_5";
  return "SEDAN_5";
}

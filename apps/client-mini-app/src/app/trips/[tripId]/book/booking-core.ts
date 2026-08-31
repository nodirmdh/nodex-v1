import type { BookingType } from "./cabin-model";

export type BookingPreferenceType =
  | "CHILD"
  | "PET"
  | "ASSISTANCE"
  | "NO_SMOKING"
  | "STOP_ON_ROUTE"
  | "QUIET_RIDE";

export type BookingBaggageChoice = "NONE" | "CABIN_BAG" | "SUITCASE" | "OVERSIZED";
export type BookingScheduleOption = "NOW" | "TODAY" | "TOMORROW" | "CUSTOM";

export type BookingPickupLocation = {
  latitude: number | null;
  longitude: number | null;
  label: string;
  comment: string;
};

export const bookingPreferenceOptions: Array<{ type: BookingPreferenceType; label: string }> = [
  { type: "CHILD", label: "С ребёнком" },
  { type: "PET", label: "С животным" },
  { type: "ASSISTANCE", label: "Нужна помощь" },
  { type: "NO_SMOKING", label: "Без курения" },
  { type: "STOP_ON_ROUTE", label: "Остановка по пути" },
  { type: "QUIET_RIDE", label: "Тихая поездка" },
];

export const baggageOptions: Array<{ type: BookingBaggageChoice; label: string }> = [
  { type: "NONE", label: "Без багажа" },
  { type: "CABIN_BAG", label: "Небольшая сумка" },
  { type: "SUITCASE", label: "Чемодан" },
  { type: "OVERSIZED", label: "Большой багаж" },
];

export const scheduleOptions: Array<{ option: BookingScheduleOption; label: string }> = [
  { option: "NOW", label: "Сейчас" },
  { option: "TODAY", label: "Сегодня" },
  { option: "TOMORROW", label: "Завтра" },
  { option: "CUSTOM", label: "Выбрать дату" },
];

export function baggageItemsForChoice(type: BookingBaggageChoice, quantity: number) {
  if (type === "NONE") return [];
  return [{ type, quantity: Math.max(1, Math.min(20, Math.floor(quantity))) }];
}

export function selectedSeatsForBooking(input: {
  bookingType: BookingType;
  selectedSeats: string[];
  availableSeatKeys: string[];
}) {
  return input.bookingType === "WHOLE_CAR" ? input.availableSeatKeys : input.selectedSeats;
}

export function buildBookingCorePayload(input: {
  tripId: string;
  bookingType: BookingType;
  passengerCount: number;
  selectedSeats: string[];
  availableSeatKeys: string[];
  baggageType: BookingBaggageChoice;
  baggageQuantity: number;
  preferenceTypes: BookingPreferenceType[];
  driverComment: string;
  pickupLocation: BookingPickupLocation;
  scheduleOption: BookingScheduleOption;
  requestedDepartureAtUtc: string | null;
}) {
  const seatKeys = selectedSeatsForBooking(input);
  const requestedDepartureAtUtc = input.requestedDepartureAtUtc || null;

  return {
    hold: {
      tripId: input.tripId,
      type: input.bookingType,
      seatKeys,
      passengerCount: input.bookingType === "WHOLE_CAR" ? seatKeys.length : input.passengerCount,
      requestedDepartureAtUtc,
      paymentMethod: "CASH" as const,
    },
    confirm: {
      baggage: baggageItemsForChoice(input.baggageType, input.baggageQuantity),
      preferences: {
        types: input.preferenceTypes,
        driverComment: input.driverComment.trim() || null,
      },
      pickupLocation: {
        latitude: input.pickupLocation.latitude,
        longitude: input.pickupLocation.longitude,
        label: input.pickupLocation.label.trim() || null,
        comment: input.pickupLocation.comment.trim() || null,
      },
      schedule: {
        option: input.scheduleOption,
        requestedDepartureAtUtc,
      },
      clientComment: input.driverComment.trim() || null,
      consentAccepted: true as const,
      paymentMethod: "CASH" as const,
    },
  };
}

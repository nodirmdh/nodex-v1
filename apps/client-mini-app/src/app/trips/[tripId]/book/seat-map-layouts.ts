import type { CabinSeat, CabinTemplate } from "./cabin-model";

export type SeatMapVehicleType = "sedan" | "minivan";
export type SeatMapShell = "sedan" | "minivan";
export type SeatMapTariff = "start" | "comfort" | "premium" | "custom";

export type SeatMapLayoutId =
  | "sedan_standard_4p"
  | "sedan_comfort_no_middle"
  | "minivan_6p"
  | "minivan_7p";

export type SeatMapSeatDefinition = {
  seatKey: string;
  label: string;
  shortLabel: string;
  x: number;
  y: number;
  rotate?: number;
  bookable: boolean;
};

export type SeatMapLayout = {
  id: SeatMapLayoutId;
  title: string;
  vehicleType: SeatMapVehicleType;
  tariff: SeatMapTariff;
  shell: SeatMapShell;
  seats: SeatMapSeatDefinition[];
};

const faceFront = 0;

export const SEAT_MAP_LAYOUTS: Record<SeatMapLayoutId, SeatMapLayout> = {
  sedan_standard_4p: {
    id: "sedan_standard_4p",
    title: "Седан",
    vehicleType: "sedan",
    tariff: "start",
    shell: "sedan",
    seats: [
      {
        seatKey: "DRIVER",
        label: "Водитель",
        shortLabel: "Водитель",
        x: 38,
        y: 31,
        rotate: faceFront,
        bookable: false,
      },
      {
        seatKey: "FRONT_RIGHT",
        label: "Переднее пассажирское",
        shortLabel: "1",
        x: 62,
        y: 31,
        rotate: faceFront,
        bookable: true,
      },
      {
        seatKey: "ROW_1_LEFT",
        label: "Заднее левое",
        shortLabel: "2",
        x: 30,
        y: 68,
        rotate: faceFront,
        bookable: true,
      },
      {
        seatKey: "ROW_1_CENTER",
        label: "Заднее среднее",
        shortLabel: "3",
        x: 50,
        y: 68,
        rotate: faceFront,
        bookable: true,
      },
      {
        seatKey: "ROW_1_RIGHT",
        label: "Заднее правое",
        shortLabel: "4",
        x: 70,
        y: 68,
        rotate: faceFront,
        bookable: true,
      },
    ],
  },
  sedan_comfort_no_middle: {
    id: "sedan_comfort_no_middle",
    title: "Комфорт",
    vehicleType: "sedan",
    tariff: "comfort",
    shell: "sedan",
    seats: [
      {
        seatKey: "DRIVER",
        label: "Водитель",
        shortLabel: "Водитель",
        x: 38,
        y: 31,
        rotate: faceFront,
        bookable: false,
      },
      {
        seatKey: "FRONT_RIGHT",
        label: "Переднее пассажирское",
        shortLabel: "1",
        x: 62,
        y: 31,
        rotate: faceFront,
        bookable: true,
      },
      {
        seatKey: "ROW_1_LEFT",
        label: "Заднее левое",
        shortLabel: "2",
        x: 36,
        y: 68,
        rotate: faceFront,
        bookable: true,
      },
      {
        seatKey: "ROW_1_RIGHT",
        label: "Заднее правое",
        shortLabel: "3",
        x: 64,
        y: 68,
        rotate: faceFront,
        bookable: true,
      },
    ],
  },
  minivan_6p: {
    id: "minivan_6p",
    title: "Минивэн · 6 мест",
    vehicleType: "minivan",
    tariff: "custom",
    shell: "minivan",
    seats: [
      {
        seatKey: "DRIVER",
        label: "Водитель",
        shortLabel: "Водитель",
        x: 38,
        y: 22,
        rotate: faceFront,
        bookable: false,
      },
      {
        seatKey: "FRONT_RIGHT",
        label: "Переднее пассажирское",
        shortLabel: "1",
        x: 62,
        y: 22,
        rotate: faceFront,
        bookable: true,
      },
      {
        seatKey: "ROW_1_LEFT",
        label: "2 ряд левое",
        shortLabel: "2",
        x: 38,
        y: 48,
        rotate: faceFront,
        bookable: true,
      },
      {
        seatKey: "ROW_1_RIGHT",
        label: "2 ряд правое",
        shortLabel: "3",
        x: 62,
        y: 48,
        rotate: faceFront,
        bookable: true,
      },
      {
        seatKey: "ROW_2_LEFT",
        label: "3 ряд левое",
        shortLabel: "4",
        x: 30,
        y: 76,
        rotate: faceFront,
        bookable: true,
      },
      {
        seatKey: "ROW_2_CENTER",
        label: "3 ряд среднее",
        shortLabel: "5",
        x: 50,
        y: 76,
        rotate: faceFront,
        bookable: true,
      },
      {
        seatKey: "ROW_2_RIGHT",
        label: "3 ряд правое",
        shortLabel: "6",
        x: 70,
        y: 76,
        rotate: faceFront,
        bookable: true,
      },
    ],
  },
  minivan_7p: {
    id: "minivan_7p",
    title: "Минивэн · 7 мест",
    vehicleType: "minivan",
    tariff: "custom",
    shell: "minivan",
    seats: [
      {
        seatKey: "DRIVER",
        label: "Водитель",
        shortLabel: "Водитель",
        x: 38,
        y: 21,
        rotate: faceFront,
        bookable: false,
      },
      {
        seatKey: "FRONT_RIGHT",
        label: "Переднее пассажирское",
        shortLabel: "1",
        x: 62,
        y: 21,
        rotate: faceFront,
        bookable: true,
      },
      {
        seatKey: "ROW_1_LEFT",
        label: "2 ряд левое",
        shortLabel: "2",
        x: 30,
        y: 48,
        rotate: faceFront,
        bookable: true,
      },
      {
        seatKey: "ROW_1_CENTER",
        label: "2 ряд среднее",
        shortLabel: "3",
        x: 50,
        y: 48,
        rotate: faceFront,
        bookable: true,
      },
      {
        seatKey: "ROW_1_RIGHT",
        label: "2 ряд правое",
        shortLabel: "4",
        x: 70,
        y: 48,
        rotate: faceFront,
        bookable: true,
      },
      {
        seatKey: "ROW_2_LEFT",
        label: "3 ряд левое",
        shortLabel: "5",
        x: 30,
        y: 76,
        rotate: faceFront,
        bookable: true,
      },
      {
        seatKey: "ROW_2_CENTER",
        label: "3 ряд среднее",
        shortLabel: "6",
        x: 50,
        y: 76,
        rotate: faceFront,
        bookable: true,
      },
      {
        seatKey: "ROW_2_RIGHT",
        label: "3 ряд правое",
        shortLabel: "7",
        x: 70,
        y: 76,
        rotate: faceFront,
        bookable: true,
      },
    ],
  },
};

export function seatMapLayoutIdForVehicle(input: {
  template?: CabinTemplate | undefined;
  model?: string | undefined;
  tariff?: string | undefined;
  passengerSeatCapacity?: number | undefined;
  seats?: CabinSeat[] | undefined;
}): SeatMapLayoutId {
  const tariff = input.tariff?.toLowerCase() ?? "";
  const model = input.model?.toLowerCase() ?? "";
  const passengerSeats =
    input.passengerSeatCapacity ??
    input.seats?.filter((seat) => seat.status !== "driver").length ??
    4;

  if (
    input.template === "MINIVAN_8" ||
    passengerSeats >= 7 ||
    /staria|minivan|минивэн|hyundai/i.test(model)
  ) {
    return passengerSeats >= 7 ? "minivan_7p" : "minivan_6p";
  }

  if (input.template === "SUV_7") return passengerSeats >= 7 ? "minivan_7p" : "minivan_6p";

  if (tariff.includes("comfort") || tariff.includes("комфорт") || input.template === "SUV_5") {
    return "sedan_comfort_no_middle";
  }

  return "sedan_standard_4p";
}

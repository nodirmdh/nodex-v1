export type EnvoVehicleLayoutId =
  | "sedan_standard_4p"
  | "sedan_comfort_no_middle"
  | "minivan_6p"
  | "minivan_7p";

export type EnvoVehicleLayout = {
  id: EnvoVehicleLayoutId;
  passengerCapacity: number;
};

export const ENVO_VEHICLE_LAYOUTS: Record<EnvoVehicleLayoutId, EnvoVehicleLayout> = {
  sedan_standard_4p: { id: "sedan_standard_4p", passengerCapacity: 4 },
  sedan_comfort_no_middle: { id: "sedan_comfort_no_middle", passengerCapacity: 3 },
  minivan_6p: { id: "minivan_6p", passengerCapacity: 6 },
  minivan_7p: { id: "minivan_7p", passengerCapacity: 7 },
};

export function envoVehicleLayoutId(input: {
  model?: string | undefined;
  tariff?: string | undefined;
  passengerCapacity?: number | undefined;
}): EnvoVehicleLayoutId {
  const model = input.model?.toLowerCase() ?? "";
  const tariff = input.tariff?.toLowerCase() ?? "";
  const capacity = input.passengerCapacity;

  if (/staria|minivan|минивэн|hyundai/i.test(model) || (capacity ?? 0) >= 6) {
    return (capacity ?? 7) >= 7 ? "minivan_7p" : "minivan_6p";
  }

  if (tariff.includes("comfort") || tariff.includes("комфорт")) {
    return "sedan_comfort_no_middle";
  }

  return "sedan_standard_4p";
}

export function envoVehiclePassengerCapacity(input: {
  model?: string | undefined;
  tariff?: string | undefined;
  passengerCapacity?: number | undefined;
}) {
  return ENVO_VEHICLE_LAYOUTS[envoVehicleLayoutId(input)].passengerCapacity;
}
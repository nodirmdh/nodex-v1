"use client";

import { cn, formatUzs } from "@nodex/ui";
import type { BookingType, CabinSeat, CabinTemplate } from "./cabin-model";
import {
  SEAT_MAP_LAYOUTS,
  type SeatMapLayout,
  type SeatMapSeatDefinition,
  seatMapLayoutIdForVehicle,
} from "./seat-map-layouts";

type CabinSelectorProps = {
  bookingType: BookingType;
  passengerCount: number;
  priceMinor: number;
  seats: CabinSeat[];
  selectedSeats: string[];
  template: CabinTemplate;
  vehicleModel?: string;
  tariff?: string;
  unavailableNotice?: string;
  onSeatToggle: (seatKey: string) => void;
};

type VisualSeatStatus = "free" | "selected" | "reserved" | "blocked" | "driver";

const stateCopy: Record<VisualSeatStatus, string> = {
  free: "доступно",
  selected: "выбрано",
  reserved: "резерв",
  blocked: "закрыто",
  driver: "место водителя",
};

function resolveVisualStatus(
  layoutSeat: SeatMapSeatDefinition,
  seat: CabinSeat | undefined,
  selected: boolean,
): VisualSeatStatus {
  if (!layoutSeat.bookable || seat?.status === "driver") return "driver";
  if (!seat || seat.status === "unavailable") return "blocked";
  if (seat.status === "occupied") return "reserved";
  if (selected) return "selected";
  return "free";
}

function VehicleShell({ shell }: { shell: SeatMapLayout["shell"] }) {
  if (shell === "minivan") {
    return (
      <svg viewBox="0 0 340 620" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path
          d="M170 18C112 20 75 42 62 89L41 176C27 238 27 401 43 473L62 541C77 591 114 607 170 610C226 607 263 591 278 541L297 473C313 401 313 238 299 176L278 89C265 42 228 20 170 18Z"
          className="fill-[rgb(var(--primary)/0.045)] stroke-[rgb(var(--primary))] [stroke-width:3.2]"
        />
        <path
          d="M83 174C99 122 128 103 170 101C212 103 241 122 257 174C272 229 272 386 257 454C242 510 211 532 170 534C129 532 98 510 83 454C68 386 68 229 83 174Z"
          className="fill-[rgb(var(--surface)/0.52)] stroke-[rgb(var(--primary)/0.25)] [stroke-width:2.4]"
        />
        <path
          d="M107 103C118 73 139 61 170 60C201 61 222 73 233 103M89 478C111 496 139 504 170 505C201 504 229 496 251 478"
          className="fill-none stroke-[rgb(var(--primary)/0.2)] [stroke-width:2.4] [stroke-linecap:round]"
        />
        <path
          d="M73 179H43M73 250H38M73 378H38M73 449H43M267 179H297M267 250H302M267 378H302M267 449H297"
          className="fill-none stroke-[rgb(var(--primary)/0.22)] [stroke-width:6] [stroke-linecap:round]"
        />
        <path
          d="M92 294H248M92 384H248M130 117C119 167 116 214 116 264M224 117C235 167 238 214 238 264"
          className="fill-none stroke-[rgb(var(--primary)/0.13)] [stroke-width:2.2] [stroke-linecap:round]"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 320 520" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <path
        d="M160 15C109 17 78 37 66 78L46 156C34 205 35 324 48 382L67 448C80 492 112 507 160 510C208 507 240 492 253 448L272 382C285 324 286 205 274 156L254 78C242 37 211 17 160 15Z"
        className="fill-[rgb(var(--primary)/0.045)] stroke-[rgb(var(--primary))] [stroke-width:3.2]"
      />
      <path
        d="M85 150C99 108 124 92 160 91C196 92 221 108 235 150C250 202 250 321 235 372C221 414 196 431 160 432C124 431 99 414 85 372C70 321 70 202 85 150Z"
        className="fill-[rgb(var(--surface)/0.56)] stroke-[rgb(var(--primary)/0.25)] [stroke-width:2.3]"
      />
      <path
        d="M101 96C114 72 133 62 160 61C187 62 206 72 219 96M85 397C106 414 132 421 160 422C188 421 214 414 235 397"
        className="fill-none stroke-[rgb(var(--primary)/0.2)] [stroke-width:2.3] [stroke-linecap:round]"
      />
      <path
        d="M75 167H45M75 232H39M75 336H39M75 400H45M245 167H275M245 232H281M245 336H281M245 400H275"
        className="fill-none stroke-[rgb(var(--primary)/0.22)] [stroke-width:5.5] [stroke-linecap:round]"
      />
      <path
        d="M92 258H228M117 111C108 153 105 190 105 229M203 111C212 153 215 190 215 229"
        className="fill-none stroke-[rgb(var(--primary)/0.13)] [stroke-width:2.1] [stroke-linecap:round]"
      />
    </svg>
  );
}
function LockMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="absolute right-0 top-0 h-3.5 w-3.5">
      <path
        d="M5 7V5.5a3 3 0 0 1 6 0V7M4.5 7h7v5.5h-7Z"
        className="fill-[rgb(var(--surface))] stroke-current [stroke-width:1.4]"
      />
    </svg>
  );
}

function SeatIcon({ status }: { status: VisualSeatStatus }) {
  const selected = status === "selected";

  return (
    <svg viewBox="0 0 72 86" aria-hidden="true" className="h-full w-full overflow-visible">
      <path
        d="M24 6H48C53 6 56 9 56 14V21C56 24 54 26 50 26H22C18 26 16 24 16 21V14C16 9 19 6 24 6Z"
        className={cn(
          "stroke-current [stroke-width:2.4]",
          selected ? "fill-current" : "fill-[rgb(var(--surface))]",
        )}
      />
      <path
        d="M15 30C18 24 26 21 36 21C46 21 54 24 57 30C60 36 61 49 59 58C58 64 54 68 48 68H24C18 68 14 64 13 58C11 49 12 36 15 30Z"
        className={cn(
          "stroke-current [stroke-width:2.7]",
          selected ? "fill-current" : "fill-[rgb(var(--surface)/0.92)]",
        )}
      />
      <path
        d="M24 36C27 33 31 32 36 32C41 32 45 33 48 36C51 40 52 51 50 56C49 59 47 61 43 61H29C25 61 23 59 22 56C20 51 21 40 24 36Z"
        className={cn(
          "stroke-current [stroke-width:2]",
          selected
            ? "fill-[rgb(var(--primary-foreground)/0.18)]"
            : "fill-[rgb(var(--surface-tint)/0.55)]",
        )}
      />
      <path
        d="M22 66C25 63 30 62 36 62C42 62 47 63 50 66C54 70 53 77 48 80H24C19 77 18 70 22 66Z"
        className={cn(
          "stroke-current [stroke-width:2.4]",
          selected ? "fill-current" : "fill-[rgb(var(--surface))]",
        )}
      />
      <path
        d="M13 40H8C6 40 5 42 5 45V56C5 59 7 61 10 61H14M59 40H64C66 40 67 42 67 45V56C67 59 65 61 62 61H58"
        className="fill-none stroke-current [stroke-width:2.2] [stroke-linecap:round]"
      />
      <path d="M36 34V61" className="stroke-current [stroke-width:1.8] opacity-30" />
    </svg>
  );
}

function SeatNode({
  layoutSeat,
  seat,
  status,
  disabled,
  priceMinor,
  onSeatToggle,
}: {
  layoutSeat: SeatMapSeatDefinition;
  seat: CabinSeat | undefined;
  status: VisualSeatStatus;
  disabled: boolean;
  priceMinor: number;
  onSeatToggle: (seatKey: string) => void;
}) {
  return (
    <button
      aria-label={`${layoutSeat.label}: ${stateCopy[status]}, ${formatUzs(priceMinor)}`}
      aria-pressed={status === "selected"}
      className={cn(
        "absolute z-20 grid aspect-[72/86] w-[clamp(42px,13vw,56px)] place-items-center border-0 bg-transparent p-0 transition duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--primary))]",
        status === "free" && "cursor-pointer text-[rgb(var(--primary))] active:scale-95",
        status === "selected" &&
          "text-[rgb(var(--primary))] drop-shadow-[0_5px_8px_rgb(var(--primary)/0.24)]",
        status === "reserved" && "cursor-not-allowed text-[#9facaa] opacity-80",
        status === "blocked" && "cursor-not-allowed text-[#bdc8c6] opacity-60",
        status === "driver" && "cursor-not-allowed text-[#314f4b] opacity-95",
      )}
      disabled={disabled}
      style={{
        left: `${layoutSeat.x}%`,
        top: `${layoutSeat.y}%`,
        transform: `translate(-50%, -50%) rotate(${layoutSeat.rotate ?? 0}deg)`,
      }}
      type="button"
      onClick={() => onSeatToggle(seat?.key ?? layoutSeat.seatKey)}
    >
      <SeatIcon status={status} />
      {status === "reserved" ? <LockMark /> : null}
      <span
        className={cn(
          "absolute left-1/2 top-[54%] -translate-x-1/2 -translate-y-1/2 text-[11px] font-black leading-none",
          status === "selected"
            ? "text-[rgb(var(--primary-foreground))]"
            : "text-[rgb(var(--foreground))]",
          status === "driver" &&
            "top-[88%] text-[7px] uppercase tracking-[0.06em] text-[rgb(var(--foreground))]",
        )}
      >
        {layoutSeat.shortLabel}
      </span>
    </button>
  );
}

export function CabinSelector({
  bookingType,
  passengerCount,
  priceMinor,
  seats,
  selectedSeats,
  template,
  vehicleModel,
  tariff,
  unavailableNotice,
  onSeatToggle,
}: CabinSelectorProps) {
  const wholeCar = bookingType === "WHOLE_CAR";
  const layoutId = seatMapLayoutIdForVehicle({
    model: vehicleModel,
    passengerSeatCapacity: seats.filter((seat) => seat.status !== "driver").length,
    seats,
    tariff,
    template,
  });
  const layout = SEAT_MAP_LAYOUTS[layoutId];
  const seatsByKey = new Map(seats.map((seat) => [seat.key, seat]));

  return (
    <section
      aria-label="Выбор места в салоне автомобиля"
      className="rounded-[30px] bg-[rgb(var(--surface))] p-4 shadow-[0_20px_48px_rgb(var(--foreground)/0.1)]"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-lg font-black">Салон</h2>
          <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
            {wholeCar
              ? "Все доступные пассажирские места подсвечены"
              : `${selectedSeats.length} из ${passengerCount} выбрано`}
          </p>
        </div>
        <span className="text-xs font-black text-[rgb(var(--primary))]">{layout.title}</span>
      </div>

      <div
        className={cn(
          "relative isolate mx-auto w-full overflow-hidden rounded-[24px] bg-[linear-gradient(180deg,rgb(var(--surface)),rgb(var(--surface-tint)/0.72))]",
          layout.vehicleType === "minivan" ? "h-[360px] max-w-[318px]" : "h-[300px] max-w-[292px]",
        )}
        role="group"
        aria-label="Пассажирские места"
      >
        <VehicleShell shell={layout.shell} />
        <div className="absolute left-1/2 top-2 z-30 -translate-x-1/2 text-[9px] font-black uppercase tracking-[0.12em] text-[rgb(var(--primary))]">
          Перед
        </div>

        {layout.seats.map((layoutSeat) => {
          const seat = seatsByKey.get(layoutSeat.seatKey);
          const selected =
            selectedSeats.includes(layoutSeat.seatKey) ||
            (wholeCar && layoutSeat.bookable && seat?.status === "available");
          const status = resolveVisualStatus(layoutSeat, seat, selected);
          const disabled =
            status === "reserved" || status === "blocked" || status === "driver" || wholeCar;

          return (
            <SeatNode
              key={layoutSeat.seatKey}
              disabled={disabled}
              layoutSeat={layoutSeat}
              onSeatToggle={onSeatToggle}
              priceMinor={priceMinor}
              seat={seat}
              status={status}
            />
          );
        })}
      </div>

      {unavailableNotice ? (
        <p
          className="m-0 mt-3 rounded-[18px] bg-[rgb(var(--warning-soft))] p-3 text-sm font-semibold text-[rgb(var(--warning))]"
          role="status"
        >
          {unavailableNotice}
        </p>
      ) : null}
    </section>
  );
}

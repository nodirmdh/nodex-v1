"use client";

import { cn, formatUzs } from "@nodex/ui";
import type { BookingType, CabinSeat, CabinTemplate } from "./cabin-model";

type CabinSelectorProps = {
  bookingType: BookingType;
  passengerCount: number;
  priceMinor: number;
  seats: CabinSeat[];
  selectedSeats: string[];
  template: CabinTemplate;
  unavailableNotice?: string;
  onSeatToggle: (seatKey: string) => void;
};

const rowNames = {
  front: "Front row",
  second: "Second row",
  third: "Third row",
} as const;

const stateCopy = {
  available: "available",
  occupied: "occupied",
  unavailable: "unavailable",
  driver: "driver seat",
} as const;

function SteeringWheel() {
  return (
    <div
      aria-hidden="true"
      className="absolute left-[18%] top-[15%] grid h-11 w-11 place-items-center rounded-full border-[7px] border-[rgb(var(--primary))] bg-[rgb(var(--surface))] shadow-[0_8px_18px_rgb(var(--primary)/0.2)]"
    >
      <span className="h-1.5 w-6 rounded-full bg-[rgb(var(--primary))]" />
    </div>
  );
}

function CabinSeatControl({
  bookingType,
  priceMinor,
  seat,
  selected,
  wholeCarHighlighted,
  onSeatToggle,
}: {
  bookingType: BookingType;
  priceMinor: number;
  seat: CabinSeat;
  selected: boolean;
  wholeCarHighlighted: boolean;
  onSeatToggle: (seatKey: string) => void;
}) {
  const disabled = seat.status !== "available" || bookingType === "WHOLE_CAR";
  const state = seat.status === "available" && selected ? "selected" : seat.status;
  const highlighted = selected || wholeCarHighlighted;
  const passengerDisabled = state === "occupied" || state === "unavailable";

  return (
    <button
      aria-disabled={disabled}
      aria-label={`${seat.label} seat, ${state === "selected" ? "selected" : stateCopy[seat.status]}, ${formatUzs(priceMinor)}`}
      aria-selected={selected}
      className={cn(
        "group relative min-h-[88px] rounded-[32px] border p-2 transition duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--primary))]",
        state === "driver" &&
          "cursor-not-allowed border-[rgb(var(--border-strong))] bg-[linear-gradient(180deg,rgb(var(--surface-muted)),rgb(var(--canvas)))] text-[rgb(var(--text-muted))] shadow-[inset_0_0_0_1px_rgb(var(--surface)/0.8)]",
        state === "available" &&
          "border-[rgb(var(--border))] bg-[linear-gradient(180deg,rgb(var(--surface)),rgb(var(--surface-tint)))] text-[rgb(var(--foreground))] shadow-[0_14px_26px_rgb(var(--foreground)/0.08)] hover:-translate-y-0.5",
        state === "selected" &&
          "scale-[1.035] border-[rgb(var(--primary))] bg-[linear-gradient(180deg,rgb(var(--primary)),rgb(var(--primary)/0.86))] text-[rgb(var(--primary-foreground))] shadow-[0_18px_34px_rgb(var(--primary)/0.34)]",
        state === "occupied" &&
          "cursor-not-allowed border-[rgb(var(--border-strong))] bg-[linear-gradient(180deg,rgb(var(--surface-muted)),rgb(var(--border)))] text-[rgb(var(--text-muted))] opacity-75 shadow-[inset_0_0_0_1px_rgb(var(--foreground)/0.04)]",
        state === "unavailable" &&
          "cursor-not-allowed border-dashed border-[rgb(var(--border-strong))] bg-[rgb(var(--canvas))] text-[rgb(var(--text-muted))] opacity-55",
        wholeCarHighlighted &&
          "border-[rgb(var(--primary))] bg-[linear-gradient(180deg,rgb(var(--primary-soft)),rgb(var(--surface-tint)))] text-[rgb(var(--primary))] shadow-[0_14px_28px_rgb(var(--primary)/0.18)]",
      )}
      disabled={disabled}
      role="option"
      type="button"
      onClick={() => onSeatToggle(seat.key)}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-1/2 top-2 h-5 w-12 -translate-x-1/2 rounded-[16px] shadow-[inset_0_-2px_5px_rgb(var(--foreground)/0.08)]",
          highlighted
            ? "bg-[rgb(var(--primary-foreground)/0.42)]"
            : passengerDisabled || state === "driver"
              ? "bg-[rgb(var(--border-strong))]"
              : "bg-[rgb(var(--surface-tint))]",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-x-2 top-[25px] h-12 rounded-[24px] border transition shadow-[inset_0_8px_14px_rgb(var(--surface)/0.42)]",
          highlighted
            ? "border-[rgb(var(--primary-foreground)/0.22)] bg-[rgb(var(--primary-foreground)/0.08)]"
            : passengerDisabled || state === "driver"
              ? "border-[rgb(var(--border-strong))] bg-[rgb(var(--surface)/0.3)]"
              : "border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.72)]",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "absolute bottom-2 left-3 right-3 h-9 rounded-[22px] shadow-[inset_0_3px_6px_rgb(var(--surface)/0.56)]",
          highlighted
            ? "bg-[rgb(var(--primary-foreground)/0.22)]"
            : passengerDisabled || state === "driver"
              ? "bg-[rgb(var(--foreground)/0.08)]"
              : "bg-[rgb(var(--surface))]",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "absolute bottom-5 left-2 h-8 w-3 rounded-full",
          highlighted ? "bg-[rgb(var(--primary-foreground)/0.18)]" : "bg-[rgb(var(--border)/0.55)]",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "absolute bottom-5 right-2 h-8 w-3 rounded-full",
          highlighted ? "bg-[rgb(var(--primary-foreground)/0.18)]" : "bg-[rgb(var(--border)/0.55)]",
        )}
      />
      <span className="relative z-10 mt-10 block text-center text-[11px] font-black leading-tight">
        {seat.label}
      </span>
      {state === "occupied" ? (
        <span className="absolute right-2 top-2 z-10 grid h-6 min-w-9 place-items-center rounded-full bg-[rgb(var(--foreground)/0.14)] px-1 text-[9px] font-black">
          Hold
        </span>
      ) : null}
      {state === "unavailable" ? (
        <span className="absolute right-2 top-2 z-10 grid h-6 min-w-8 place-items-center rounded-full border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))] px-1 text-[9px] font-black">
          Off
        </span>
      ) : null}
    </button>
  );
}

function SeatRow({
  bookingType,
  priceMinor,
  row,
  seats,
  selectedSeats,
  wholeCar,
  onSeatToggle,
}: {
  bookingType: BookingType;
  priceMinor: number;
  row: CabinSeat["row"];
  seats: CabinSeat[];
  selectedSeats: string[];
  wholeCar: boolean;
  onSeatToggle: (seatKey: string) => void;
}) {
  const rowSeats = seats.filter((seat) => seat.row === row);
  if (rowSeats.length === 0) return null;

  return (
    <div aria-label={rowNames[row]} className="grid grid-cols-3 items-center gap-2" role="group">
      {(["left", "center", "right"] as const).map((position) => {
        const seat = rowSeats.find((item) => item.position === position);
        if (!seat) {
          return (
            <div
              key={position}
              aria-hidden="true"
              className={cn(
                "min-h-[88px] rounded-[28px]",
                row === "front"
                  ? "bg-[linear-gradient(180deg,rgb(var(--foreground)/0.045),rgb(var(--surface)/0.3))] shadow-[inset_0_0_0_1px_rgb(var(--surface)/0.7)]"
                  : "bg-[rgb(var(--surface)/0.28)]",
              )}
            />
          );
        }

        return (
          <CabinSeatControl
            key={seat.key}
            bookingType={bookingType}
            onSeatToggle={onSeatToggle}
            priceMinor={priceMinor}
            seat={seat}
            selected={selectedSeats.includes(seat.key)}
            wholeCarHighlighted={wholeCar && seat.status === "available"}
          />
        );
      })}
    </div>
  );
}

export function CabinSelector({
  bookingType,
  passengerCount,
  priceMinor,
  seats,
  selectedSeats,
  template,
  unavailableNotice,
  onSeatToggle,
}: CabinSelectorProps) {
  const wholeCar = bookingType === "WHOLE_CAR";
  const hasThirdRow = seats.some((seat) => seat.row === "third");
  const templateLabel =
    template === "MINIVAN_8"
      ? "Minivan cabin"
      : template === "SUV_7"
        ? "Seven-seat SUV cabin"
        : template === "SUV_5"
          ? "SUV cabin"
          : "Sedan cabin";

  return (
    <section
      aria-label="Real car cabin seat picker"
      className="rounded-[34px] bg-[rgb(var(--surface))] p-4 shadow-[0_24px_60px_rgb(var(--foreground)/0.12)]"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-lg font-black">Cabin</h2>
          <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
            {wholeCar
              ? "All available passenger seats highlighted"
              : `${selectedSeats.length} of ${passengerCount} selected`}
          </p>
        </div>
        <span className="rounded-full bg-[rgb(var(--surface-tint))] px-3 py-2 text-xs font-black text-[rgb(var(--primary))]">
          {templateLabel}
        </span>
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-[42px] border border-[rgb(var(--primary)/0.18)] bg-[radial-gradient(circle_at_50%_12%,rgb(var(--surface))_0%,rgb(var(--surface-tint))_34%,rgb(var(--canvas))_100%)] p-4 shadow-[inset_0_10px_24px_rgb(var(--surface)/0.86),inset_0_-18px_36px_rgb(var(--foreground)/0.04)]",
          hasThirdRow ? "min-h-[620px]" : "min-h-[452px]",
        )}
        role="listbox"
        aria-label="Passenger seats"
      >
        <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-[rgb(var(--primary))] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[rgb(var(--primary-foreground))]">
          Front
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-x-7 top-4 h-16 rounded-t-[42px] bg-[linear-gradient(180deg,rgb(var(--surface)/0.94),rgb(var(--surface)/0.3))] shadow-[0_12px_20px_rgb(var(--primary)/0.08)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-5 bottom-4 top-8 rounded-[54px] border-[11px] border-[rgb(var(--primary)/0.13)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-12 top-16 h-12 rounded-[28px] bg-[linear-gradient(180deg,rgb(var(--foreground)/0.08),rgb(var(--foreground)/0.035))]"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-12 left-1/2 top-32 w-[18%] -translate-x-1/2 rounded-[32px] bg-[linear-gradient(180deg,rgb(var(--surface)/0.34),rgb(var(--foreground)/0.035),rgb(var(--surface)/0.5))]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-12 bottom-8 h-3 rounded-full bg-[rgb(var(--primary)/0.12)]"
        />
        <SteeringWheel />

        <div className={cn("relative z-10 grid pt-20", hasThirdRow ? "gap-6" : "gap-7")}>
          <SeatRow
            bookingType={bookingType}
            onSeatToggle={onSeatToggle}
            priceMinor={priceMinor}
            row="front"
            seats={seats}
            selectedSeats={selectedSeats}
            wholeCar={wholeCar}
          />
          <div
            aria-hidden="true"
            className="mx-auto h-14 w-20 rounded-[28px] bg-[linear-gradient(180deg,rgb(var(--foreground)/0.075),rgb(var(--surface)/0.4))] shadow-[inset_0_2px_8px_rgb(var(--foreground)/0.05)]"
          />
          <SeatRow
            bookingType={bookingType}
            onSeatToggle={onSeatToggle}
            priceMinor={priceMinor}
            row="second"
            seats={seats}
            selectedSeats={selectedSeats}
            wholeCar={wholeCar}
          />
          {hasThirdRow ? (
            <>
              <div
                aria-hidden="true"
                className="mx-auto h-12 w-24 rounded-[24px] bg-[linear-gradient(90deg,transparent,rgb(var(--surface)/0.82),transparent)]"
              />
              <SeatRow
                bookingType={bookingType}
                onSeatToggle={onSeatToggle}
                priceMinor={priceMinor}
                row="third"
                seats={seats}
                selectedSeats={selectedSeats}
                wholeCar={wholeCar}
              />
            </>
          ) : null}
        </div>
      </div>

      {unavailableNotice ? (
        <p
          className="m-0 mt-3 rounded-[22px] bg-[rgb(var(--warning-soft))] p-3 text-sm font-semibold text-[rgb(var(--warning))]"
          role="status"
        >
          {unavailableNotice}
        </p>
      ) : null}
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader, Badge, BottomNav, Button, Panel, formatUzs } from "@nodex/ui";

const seatLayout = [
  { key: "FRONT_RIGHT", label: "Front", status: "available" },
  { key: "ROW_1_LEFT", label: "1L", status: "available" },
  { key: "ROW_1_RIGHT", label: "1R", status: "available" },
  { key: "ROW_2_LEFT", label: "2L", status: "held" },
  { key: "ROW_2_RIGHT", label: "2R", status: "available" },
];

const trip = {
  route: "Nukus to Urgench",
  departure: "08:30",
  priceMinor: 8500000,
  wholeCarPriceMinor: 39000000,
};

export default function BookingFlowPage() {
  const [bookingType, setBookingType] = useState<"SEAT" | "MULTI_SEAT" | "WHOLE_CAR">("SEAT");
  const [selectedSeats, setSelectedSeats] = useState<string[]>(["FRONT_RIGHT"]);
  const [step, setStep] = useState<"hold" | "passengers" | "confirmed">("hold");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "MANUAL_TRANSFER">("CASH");

  const selectableSeats = seatLayout.filter((seat) => seat.status === "available");
  const effectiveSeats =
    bookingType === "WHOLE_CAR" ? selectableSeats.map((seat) => seat.key) : selectedSeats;
  const totalMinor =
    bookingType === "WHOLE_CAR"
      ? trip.wholeCarPriceMinor
      : trip.priceMinor * Math.max(1, effectiveSeats.length);

  const passengerFields = useMemo(
    () =>
      effectiveSeats.map((seatKey, index) => ({
        seatKey,
        label: seatLayout.find((seat) => seat.key === seatKey)?.label ?? seatKey,
        name: index === 0 ? "Primary passenger" : `Passenger ${index + 1}`,
      })),
    [effectiveSeats],
  );

  function toggleSeat(seatKey: string) {
    if (bookingType === "SEAT") {
      setSelectedSeats([seatKey]);
      return;
    }
    setSelectedSeats((current) =>
      current.includes(seatKey) ? current.filter((key) => key !== seatKey) : [...current, seatKey],
    );
  }

  function changeType(next: "SEAT" | "MULTI_SEAT" | "WHOLE_CAR") {
    setBookingType(next);
    if (next === "WHOLE_CAR") setSelectedSeats(selectableSeats.map((seat) => seat.key));
    if (next === "SEAT") setSelectedSeats([selectableSeats[0]?.key ?? "FRONT_RIGHT"]);
  }

  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="Book seats" subtitle={`${trip.route} at ${trip.departure}`} />
      <div className="space-y-4 px-4">
        <Panel className="space-y-3" aria-label="Seat hold">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="m-0 text-xl font-black">Seat selection</h1>
              <p className="m-0 text-sm text-slate-500">Hold expires in 09:48</p>
            </div>
            <Badge tone="warning">Temporary hold</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Booking type">
            {(["SEAT", "MULTI_SEAT", "WHOLE_CAR"] as const).map((type) => (
              <Button
                key={type}
                type="button"
                variant={bookingType === type ? "primary" : "secondary"}
                onClick={() => changeType(type)}
              >
                {type === "SEAT" ? "Seat" : type === "MULTI_SEAT" ? "Multi" : "Car"}
              </Button>
            ))}
          </div>
        </Panel>

        <Panel className="space-y-3" aria-label="Seat picker">
          <h2 className="m-0 text-base font-bold">Available seats</h2>
          <div className="grid grid-cols-2 gap-2">
            {seatLayout.map((seat) => {
              const selected = effectiveSeats.includes(seat.key);
              const disabled = seat.status !== "available" || bookingType === "WHOLE_CAR";
              return (
                <button
                  key={seat.key}
                  aria-pressed={selected}
                  className={`min-h-14 rounded-[var(--radius-md)] border px-3 text-sm font-semibold ${
                    selected
                      ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                      : "border-[rgb(var(--border))] bg-[rgb(var(--surface))]"
                  } ${seat.status !== "available" ? "opacity-45" : ""}`}
                  disabled={disabled}
                  type="button"
                  onClick={() => toggleSeat(seat.key)}
                >
                  {seat.label}
                  <span className="block text-xs font-medium">
                    {seat.status === "available" ? formatUzs(trip.priceMinor) : "Held"}
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>

        {step !== "confirmed" ? (
          <Panel className="space-y-3" aria-label="Passenger details">
            <h2 className="m-0 text-base font-bold">Passengers</h2>
            {passengerFields.map((passenger) => (
              <label key={passenger.seatKey} className="grid gap-1">
                <span className="text-xs font-semibold text-slate-500">
                  {passenger.name} В· {passenger.label}
                </span>
                <input
                  className="rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3 py-2"
                  defaultValue={passenger.name}
                />
              </label>
            ))}
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-500">Payment method</span>
              <select
                className="rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3 py-2"
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(event.target.value as "CASH" | "MANUAL_TRANSFER")
                }
              >
                <option value="CASH">Cash to driver</option>
                <option value="MANUAL_TRANSFER">Manual transfer</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" defaultChecked />
              Small suitcase
            </label>
          </Panel>
        ) : (
          <Panel className="space-y-3" aria-label="Booking confirmation">
            <Badge tone="success">Confirmed</Badge>
            <h2 className="m-0 text-base font-bold">Booking confirmed</h2>
            <p className="m-0 text-sm text-slate-500">
              Your seats are booked. Pay by{" "}
              {paymentMethod === "CASH" ? "cash to driver" : "manual transfer"}.
            </p>
          </Panel>
        )}

        <Panel className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">{effectiveSeats.length} seat(s)</span>
            <strong>{formatUzs(totalMinor)}</strong>
          </div>
          {step === "hold" ? (
            <Button
              className="w-full"
              disabled={effectiveSeats.length === 0}
              type="button"
              onClick={() => setStep("passengers")}
            >
              Continue
            </Button>
          ) : step === "passengers" ? (
            <Button className="w-full" type="button" onClick={() => setStep("confirmed")}>
              Confirm booking
            </Button>
          ) : (
            <Link
              className="inline-flex min-h-10 w-full items-center justify-center rounded-[var(--radius-md)] bg-[rgb(var(--primary))] px-4 text-sm font-semibold text-[rgb(var(--primary-foreground))]"
              href="/bookings"
            >
              View my bookings
            </Link>
          )}
        </Panel>
      </div>
      <BottomNav
        items={[
          { label: "Home" },
          { label: "Search", active: true },
          { label: "Bookings" },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}

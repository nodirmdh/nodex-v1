"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Badge, Button, VehicleImage, formatUzs } from "@nodex/ui";
import { CabinSelector } from "./cabin-selector";
import {
  type BookingType,
  cabinSeats,
  selectableSeatKeys,
  seatLabelForKey,
  sevenSeatPreview,
  tripCabin,
} from "./cabin-model";

type IconName = "back" | "car" | "clock" | "shield" | "users";

const iconPaths: Record<IconName, ReactNode> = {
  back: <path d="m15 6-6 6 6 6" />,
  car: (
    <path d="M5 14h14l-1.8-4.2A2 2 0 0 0 15.4 8H8.6a2 2 0 0 0-1.8 1.2L5 14Zm1 0v4m12-4v4M7.5 18h.1m8.8 0h.1" />
  ),
  clock: <path d="M12 6v6l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  shield: <path d="M12 3 5 6v5c0 4.2 2.8 7.6 7 10 4.2-2.4 7-5.8 7-10V6l-7-3Z" />,
  users: (
    <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6.5-.5a2.5 2.5 0 1 0 0-5M3.5 19a5.5 5.5 0 0 1 11 0M14 15.5c2.5.3 4.2 1.5 5 3.5" />
  ),
};

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height="18"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="18"
    >
      {iconPaths[name]}
    </svg>
  );
}

export default function BookingFlowPage() {
  const [bookingType, setBookingType] = useState<BookingType>("SEAT");
  const [selectedSeats, setSelectedSeats] = useState<string[]>(["FRONT_RIGHT"]);
  const [step, setStep] = useState<"hold" | "passengers" | "confirmed">("hold");
  const [passengerCount, setPassengerCount] = useState(1);
  const [previewSevenSeat, setPreviewSevenSeat] = useState(false);
  const [unavailableNotice, setUnavailableNotice] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPreviewSevenSeat(params.get("layout") === "suv7");
    if (params.get("state") === "empty") setSelectedSeats([]);
  }, []);

  const visibleSeats = previewSevenSeat ? sevenSeatPreview : cabinSeats;
  const availableSeatKeys = useMemo(() => selectableSeatKeys(visibleSeats), [visibleSeats]);
  const effectiveSeats = bookingType === "WHOLE_CAR" ? availableSeatKeys : selectedSeats;
  const requiredSeats = bookingType === "MULTI_SEAT" ? passengerCount : 1;
  const requestReady =
    bookingType === "WHOLE_CAR"
      ? availableSeatKeys.length > 0
      : selectedSeats.length === requiredSeats && selectedSeats.length > 0;
  const totalMinor =
    bookingType === "WHOLE_CAR"
      ? tripCabin.wholeCarPriceMinor
      : tripCabin.priceMinor * Math.max(1, effectiveSeats.length);
  const selectedSummary =
    bookingType === "WHOLE_CAR"
      ? "Whole car"
      : effectiveSeats.map((seatKey) => seatLabelForKey(visibleSeats, seatKey)).join(", ") ||
        "No seat selected";
  const primaryAction =
    bookingType === "WHOLE_CAR"
      ? "Request whole car"
      : requiredSeats > 1
        ? `Request ${requiredSeats} seats`
        : "Request this seat";

  const passengerFields = useMemo(
    () =>
      effectiveSeats.map((seatKey, index) => ({
        seatKey,
        label: seatLabelForKey(visibleSeats, seatKey),
        name: index === 0 ? "Primary passenger" : `Passenger ${index + 1}`,
      })),
    [effectiveSeats, visibleSeats],
  );

  function toggleSeat(seatKey: string) {
    setUnavailableNotice("");
    if (!availableSeatKeys.includes(seatKey)) {
      setUnavailableNotice("That seat is no longer available. The cabin state was kept intact.");
      return;
    }

    if (bookingType === "SEAT") {
      setSelectedSeats([seatKey]);
      return;
    }

    setSelectedSeats((current) => {
      if (current.includes(seatKey)) return current.filter((key) => key !== seatKey);
      if (current.length >= passengerCount) return [...current.slice(1), seatKey];
      return [...current, seatKey];
    });
  }

  function changeType(next: BookingType) {
    setUnavailableNotice("");
    setBookingType(next);
    if (next === "WHOLE_CAR") {
      setSelectedSeats(availableSeatKeys);
      return;
    }
    if (next === "MULTI_SEAT") {
      setPassengerCount(2);
      setSelectedSeats(availableSeatKeys.slice(0, 2));
      return;
    }
    setPassengerCount(1);
    setSelectedSeats([availableSeatKeys[0] ?? "FRONT_RIGHT"]);
  }

  function requestSeatHold() {
    if (!requestReady) {
      setUnavailableNotice(
        bookingType === "MULTI_SEAT"
          ? `Select ${requiredSeats} available seats before sending the request.`
          : "Select an available seat before sending the request.",
      );
      return;
    }
    setStep("passengers");
  }

  return (
    <main className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      <div className="mx-auto min-h-screen max-w-[430px] bg-[linear-gradient(180deg,rgb(var(--surface-tint))_0%,rgb(var(--background))_28%,rgb(var(--canvas))_100%)] px-4 pb-6 pt-4">
        <header className="flex items-center gap-3">
          <Link
            aria-label="Back to trip details"
            className="grid h-11 w-11 place-items-center rounded-full bg-[rgb(var(--surface)/0.92)] text-[rgb(var(--foreground))] shadow-[var(--shadow-xs)]"
            href="/trips/phase5-nukus-urgench-morning"
          >
            <Icon name="back" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="m-0 text-xl font-black">Choose your seat</h1>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
              {tripCabin.model} · {tripCabin.departure}
            </p>
          </div>
          <VehicleImage alt={tripCabin.model} className="h-12 w-16 rounded-[18px]" />
        </header>

        <section className="mt-5 rounded-[30px] bg-[rgb(var(--surface)/0.96)] p-4 shadow-[0_18px_46px_rgb(var(--foreground)/0.1)] backdrop-blur">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-[rgb(var(--primary))]">
                <Icon name="car" className="h-4 w-4" />
                {tripCabin.color} · {tripCabin.capacity}
              </div>
              <div className="mt-1 text-xl font-black">{tripCabin.model}</div>
              <div className="text-sm font-semibold text-[rgb(var(--text-muted))]">
                {tripCabin.route}
              </div>
            </div>
            <div className="text-right">
              <Badge tone="info">{tripCabin.plate}</Badge>
              <div className="mt-2 flex items-center justify-end gap-1 text-xs font-black text-[rgb(var(--text-muted))]">
                <Icon name="shield" className="h-4 w-4 text-[rgb(var(--primary))]" />
                Verified
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="Request type">
            {(["SEAT", "MULTI_SEAT", "WHOLE_CAR"] as const).map((type) => (
              <button
                key={type}
                aria-pressed={bookingType === type}
                className={[
                  "min-h-11 rounded-full px-2 text-sm font-black transition",
                  bookingType === type
                    ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] shadow-[var(--shadow-md)]"
                    : "bg-[rgb(var(--canvas))] text-[rgb(var(--text-muted))]",
                ].join(" ")}
                type="button"
                onClick={() => changeType(type)}
              >
                {type === "SEAT"
                  ? "Single seat"
                  : type === "MULTI_SEAT"
                    ? "2 passengers"
                    : "Whole car"}
              </button>
            ))}
          </div>
        </section>

        <div className="mt-4">
          <CabinSelector
            bookingType={bookingType}
            onSeatToggle={toggleSeat}
            passengerCount={requiredSeats}
            priceMinor={tripCabin.priceMinor}
            seats={visibleSeats}
            selectedSeats={selectedSeats}
            template={previewSevenSeat ? "SUV_7" : tripCabin.template}
            unavailableNotice={unavailableNotice}
          />
        </div>

        <section className="mt-4 rounded-[28px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-md)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-lg font-black">Selected</h2>
              <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                {bookingType === "WHOLE_CAR"
                  ? `${availableSeatKeys.length} available passenger seats`
                  : `${effectiveSeats.length} of ${requiredSeats} selected`}
              </p>
            </div>
            <Badge tone={requestReady ? "success" : "warning"}>
              {requestReady ? "Ready" : "Select seat"}
            </Badge>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3 rounded-[26px] bg-[linear-gradient(135deg,rgb(var(--canvas)),rgb(var(--surface-tint)))] p-3 shadow-[inset_0_0_0_1px_rgb(var(--surface)/0.8)]">
            <div>
              <div className="text-base font-black">{selectedSummary}</div>
              <div className="mt-1 flex items-center gap-1 text-xs font-bold text-[rgb(var(--text-muted))]">
                <Icon name="clock" className="h-4 w-4" />
                Hold starts after request
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-[rgb(var(--text-muted))]">
                {bookingType === "WHOLE_CAR" ? "Whole car" : "Price per seat"}
              </div>
              <div className="text-xl font-black text-[rgb(var(--foreground))]">
                {formatUzs(totalMinor)}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 text-[11px] font-bold text-[rgb(var(--text-muted))]">
            {[
              ["bg-[rgb(var(--surface))] border-[rgb(var(--border))]", "Available"],
              ["bg-[rgb(var(--primary))] border-[rgb(var(--primary))]", "Selected"],
              ["bg-[rgb(var(--surface-muted))] border-[rgb(var(--border))]", "Occupied"],
              [
                "bg-[rgb(var(--canvas))] border-dashed border-[rgb(var(--border-strong))]",
                "Unavailable",
              ],
            ].map(([sample, label]) => (
              <div key={label} className="grid gap-1">
                <span className={`h-5 rounded-full border ${sample}`} />
                {label}
              </div>
            ))}
          </div>

          {step === "hold" ? (
            <Button
              className="mt-4 w-full"
              disabled={!requestReady}
              type="button"
              onClick={requestSeatHold}
            >
              {primaryAction}
            </Button>
          ) : null}
        </section>

        {step !== "hold" ? (
          <section
            aria-label={step === "confirmed" ? "Booking confirmation" : "Passenger details"}
            className="mt-4 rounded-[28px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-md)]"
          >
            {step === "passengers" ? (
              <>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="m-0 text-lg font-black">Passenger details</h2>
                    <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                      Existing request flow keeps seat IDs intact.
                    </p>
                  </div>
                  <Badge tone="accent">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="users" className="h-4 w-4" />
                      {effectiveSeats.length}
                    </span>
                  </Badge>
                </div>

                <div className="grid gap-3">
                  {passengerFields.map((passenger) => (
                    <label key={passenger.seatKey} className="grid gap-1">
                      <span className="text-xs font-bold text-[rgb(var(--text-muted))]">
                        {passenger.name} · {passenger.label}
                      </span>
                      <input
                        className="min-h-11 rounded-[18px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm font-semibold"
                        defaultValue={passenger.name}
                      />
                    </label>
                  ))}
                </div>

                <label className="mt-3 flex items-center gap-2 rounded-[20px] bg-[rgb(var(--surface-tint))] p-3 text-sm font-semibold">
                  <input type="checkbox" defaultChecked />
                  Small suitcase
                </label>
                <p className="m-0 mt-3 text-xs font-semibold text-[rgb(var(--text-muted))]">
                  Payment is arranged directly with the driver.
                </p>
                <Button className="mt-4 w-full" type="button" onClick={() => setStep("confirmed")}>
                  Send request
                </Button>
              </>
            ) : (
              <>
                <Badge tone="success">Request sent</Badge>
                <h2 className="m-0 mt-3 text-lg font-black">Seat request created</h2>
                <p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">
                  {selectedSummary} is attached to your request. The driver will confirm the final
                  arrangement.
                </p>
                <Link
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] bg-[rgb(var(--primary))] px-4 text-sm font-bold text-[rgb(var(--primary-foreground))] no-underline"
                  href="/bookings"
                >
                  View my bookings
                </Link>
              </>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}

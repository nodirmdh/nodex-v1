export const launchCities = ["Nukus", "Kungrad", "Urgench", "Khiva", "Tashkent", "Samarkand"];

export const mockTrips = [
  {
    id: "trip_nukus_urgench_morning",
    origin: "Nukus",
    destination: "Urgench",
    departure: "08:30",
    arrival: "11:20",
    duration: "2h 50m",
    driver: "Driver A.",
    rating: 4.9,
    reliability: 96,
    car: "Chevrolet Cobalt",
    amenities: ["AC", "No smoking", "Parcel"],
    seatsLeft: 3,
    priceMinor: 8500000,
  },
  {
    id: "trip_kungrad_nukus_evening",
    origin: "Kungrad",
    destination: "Nukus",
    departure: "18:10",
    arrival: "20:00",
    duration: "1h 50m",
    driver: "Driver B.",
    rating: 4.8,
    reliability: 93,
    car: "Hyundai Staria",
    amenities: ["Large luggage", "Family", "AC"],
    seatsLeft: 6,
    priceMinor: 7000000,
  },
];

export const mockDriverPassengers = [
  { seat: "1A", name: "Passenger 1", status: "confirmed" },
  { seat: "1B", name: "Passenger 2", status: "boarding" },
  { seat: "2A", name: "Parcel", status: "accepted" },
];

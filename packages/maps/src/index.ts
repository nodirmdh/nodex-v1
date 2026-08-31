export interface GeoPoint {
  label: string;
  lat: number | null;
  lng: number | null;
  source: "manual" | "map" | "geocoder";
}

export interface MapsAdapter {
  geocode(query: string): Promise<GeoPoint[]>;
  routeEstimate(
    points: GeoPoint[],
  ): Promise<{ distanceMeters: number | null; durationSeconds: number | null }>;
}

export class ManualMapsAdapter implements MapsAdapter {
  async geocode(query: string) {
    return [{ label: query, lat: null, lng: null, source: "manual" as const }];
  }

  async routeEstimate() {
    return { distanceMeters: null, durationSeconds: null };
  }
}

const earthRadiusMeters = 6371000;
const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function distanceMetersBetween(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
) {
  const dLat = degreesToRadians(end.lat - start.lat);
  const dLng = degreesToRadians(end.lng - start.lng);
  const startLat = degreesToRadians(start.lat);
  const endLat = degreesToRadians(end.lat);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(startLat) * Math.cos(endLat) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

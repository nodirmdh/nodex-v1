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

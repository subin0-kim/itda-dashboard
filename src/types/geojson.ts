export type GeoJsonProperties = Record<string, string | number | boolean | null | undefined>;

export interface GeoJsonFeature {
  type: "Feature";
  id?: string | number;
  properties: GeoJsonProperties;
  geometry: unknown;
}

export interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

import { useJsonData } from "./useJsonData";
import type { GeoJsonFeatureCollection } from "../types/geojson";

export function useGeoJsonData(path: string) {
  return useJsonData<GeoJsonFeatureCollection>(path);
}

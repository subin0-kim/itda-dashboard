import type { GeoJsonFeatureCollection } from "../types/geojson";
import { getGeoJsonBounds } from "./geojson";

export function getBoundsForMap(collection: GeoJsonFeatureCollection) {
  return getGeoJsonBounds(collection);
}

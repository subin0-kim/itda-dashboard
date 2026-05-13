import type { GeoJsonFeatureCollection } from "../types/geojson";

type Ring = Array<[number, number]>;
type Polygon = Ring[];

export interface BoundaryMask {
  polygons: Polygon[];
  bbox: [number, number, number, number];
}

export function buildBoundaryMask(boundary: GeoJsonFeatureCollection): BoundaryMask | null {
  const polygons: Polygon[] = [];
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const feature of boundary.features) {
    extractPolygons(feature.geometry, polygons);
  }
  if (polygons.length === 0) return null;

  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }
  return { polygons, bbox: [minLng, minLat, maxLng, maxLat] };
}

export function isPointInsideMask(lng: number, lat: number, mask: BoundaryMask): boolean {
  const [minLng, minLat, maxLng, maxLat] = mask.bbox;
  if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) return false;
  for (const polygon of mask.polygons) {
    if (pointInPolygon(lng, lat, polygon)) return true;
  }
  return false;
}

function pointInPolygon(lng: number, lat: number, polygon: Polygon): boolean {
  if (polygon.length === 0) return false;
  if (!pointInRing(lng, lat, polygon[0])) return false;
  for (let i = 1; i < polygon.length; i += 1) {
    if (pointInRing(lng, lat, polygon[i])) return false;
  }
  return true;
}

function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function extractPolygons(geometry: unknown, output: Polygon[]) {
  if (!geometry || typeof geometry !== "object") return;
  const geom = geometry as { type?: string; coordinates?: unknown; geometries?: unknown[] };
  if (geom.type === "GeometryCollection" && Array.isArray(geom.geometries)) {
    for (const child of geom.geometries) extractPolygons(child, output);
    return;
  }
  if (geom.type === "Polygon" && Array.isArray(geom.coordinates)) {
    output.push(coerceRings(geom.coordinates));
    return;
  }
  if (geom.type === "MultiPolygon" && Array.isArray(geom.coordinates)) {
    for (const polygon of geom.coordinates) {
      if (Array.isArray(polygon)) output.push(coerceRings(polygon));
    }
  }
}

function coerceRings(rings: unknown): Polygon {
  if (!Array.isArray(rings)) return [];
  const result: Polygon = [];
  for (const ring of rings) {
    if (!Array.isArray(ring)) continue;
    const coords: Ring = [];
    for (const point of ring) {
      if (Array.isArray(point) && typeof point[0] === "number" && typeof point[1] === "number") {
        coords.push([point[0], point[1]]);
      }
    }
    if (coords.length > 0) result.push(coords);
  }
  return result;
}

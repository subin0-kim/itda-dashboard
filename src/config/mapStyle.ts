import type { LngLatBoundsLike, LngLatLike, StyleSpecification } from "maplibre-gl";

export const DEFAULT_SEOUL_CENTER: LngLatLike = [126.978, 37.5665];
export const DEFAULT_SEOUL_ZOOM = 10.4;
export const DEFAULT_MAP_BOUNDS: LngLatBoundsLike = [
  [126.734, 37.413],
  [127.27, 37.715],
];

export const BASE_MAP_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>';

const CARTO_POSITRON_TILES = [
  "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
  "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
  "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
  "https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
];

const OSM_TILES = [
  "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
  "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
  "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
];

const OSM_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

export const BASEMAP_SOURCE_ID = "basemap-tiles";
export const BASEMAP_LAYER_ID = "basemap-raster";
export const BASEMAP_BACKGROUND_LAYER_ID = "basemap-background";

export const BASE_MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    [BASEMAP_SOURCE_ID]: {
      type: "raster",
      tiles: CARTO_POSITRON_TILES,
      tileSize: 256,
      maxzoom: 19,
      attribution: BASE_MAP_ATTRIBUTION,
    },
  },
  layers: [
    {
      id: BASEMAP_BACKGROUND_LAYER_ID,
      type: "background",
      paint: { "background-color": "#f6f7fb" },
    },
    {
      id: BASEMAP_LAYER_ID,
      type: "raster",
      source: BASEMAP_SOURCE_ID,
      paint: {
        "raster-opacity": 1,
        "raster-contrast": 0.12,
        "raster-saturation": -0.08,
      },
    },
  ],
};

export const OSM_FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    [BASEMAP_SOURCE_ID]: {
      type: "raster",
      tiles: OSM_TILES,
      tileSize: 256,
      maxzoom: 19,
      attribution: OSM_ATTRIBUTION,
    },
  },
  layers: [
    {
      id: BASEMAP_BACKGROUND_LAYER_ID,
      type: "background",
      paint: { "background-color": "#f6f7fb" },
    },
    {
      id: BASEMAP_LAYER_ID,
      type: "raster",
      source: BASEMAP_SOURCE_ID,
      paint: {
        "raster-opacity": 0.98,
        "raster-contrast": 0.08,
        "raster-saturation": -0.05,
      },
    },
  ],
};

export const EMPTY_FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: BASEMAP_BACKGROUND_LAYER_ID,
      type: "background",
      paint: { "background-color": "#f1f5f9" },
    },
  ],
};

export const BASEMAP_ERROR_MESSAGE =
  "지도 배경을 불러오지 못했습니다. 데이터 요약 정보는 계속 확인할 수 있습니다.";

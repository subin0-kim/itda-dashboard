import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type MapLayerMouseEvent } from "maplibre-gl";
import { useNavigate } from "react-router-dom";
import { BASE_MAP_STYLE, DEFAULT_MAP_BOUNDS, DEFAULT_SEOUL_CENTER, DEFAULT_SEOUL_ZOOM } from "../../config/mapStyle";
import { useBasemapStatus } from "../../hooks/useBasemapStatus";
import type { CategoryId, DistrictScore } from "../../types/data";
import type { GeoJsonFeatureCollection } from "../../types/geojson";
import type { OverviewCategoryId } from "../../utils/category";
import { CATEGORY_LABELS, FACILITY_TYPE_OPTIONS, getFacilityTypeLabel, getOverviewCategory } from "../../utils/category";
import { getMapLibreScoreExpression } from "../../utils/colorScales";
import { filterFacilities, normalizeCategory, readString } from "../../utils/district";
import { getGeoJsonBounds, mergeDistrictScores } from "../../utils/geojson";
import { BasemapErrorBanner } from "./BasemapErrorBanner";
import { FACILITY_CATEGORY_COLORS, FacilityLegend } from "./FacilityLegend";
import { MapTooltip } from "./MapTooltip";
import { ScoreLegend } from "./ScoreLegend";

import "maplibre-gl/dist/maplibre-gl.css";

interface SeoulDistrictMapProps {
  districts: GeoJsonFeatureCollection;
  scores: DistrictScore[];
  categoryId: OverviewCategoryId;
  facilities?: GeoJsonFeatureCollection | null;
}

const SOURCE_ID = "seoul-districts";
const FILL_LAYER_ID = "district-fill";
const LINE_LAYER_ID = "district-line";
const FACILITY_SOURCE_ID = "overview-facilities";
const FACILITY_LAYER_ID = "overview-facility-points";

export function SeoulDistrictMap({ districts, scores, categoryId, facilities }: SeoulDistrictMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const hoveredIdRef = useRef<string | number | null>(null);
  const hoveredFacilityIdRef = useRef<string | number | null>(null);
  const navigate = useNavigate();
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [layersReady, setLayersReady] = useState(false);
  const [tooltip, setTooltip] = useState<{ point: maplibregl.PointLike; districtName: string; scoreLabel: string } | null>(null);
  const basemapError = useBasemapStatus(map);
  const category = getOverviewCategory(categoryId);

  const mapData = useMemo(() => mergeDistrictScores(districts, scores, categoryId), [districts, scores, categoryId]);
  const facilityTypes = useMemo(
    () => (categoryId === "overall" ? [] : FACILITY_TYPE_OPTIONS[categoryId].map((option) => option.id)),
    [categoryId],
  );
  const facilityData = useMemo(
    () => (facilities ? filterFacilities(facilities, categoryId, facilityTypes) : { type: "FeatureCollection" as const, features: [] }),
    [facilities, categoryId, facilityTypes],
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const instance = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_MAP_STYLE,
      center: DEFAULT_SEOUL_CENTER,
      zoom: DEFAULT_SEOUL_ZOOM,
      maxBounds: DEFAULT_MAP_BOUNDS,
      attributionControl: false,
    });
    mapRef.current = instance;
    setMap(instance);
    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    instance.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    return () => {
      popupRef.current?.remove();
      instance.remove();
      mapRef.current = null;
      setMap(null);
    };
  }, []);

  useEffect(() => {
    const instance = mapRef.current;
    if (!instance) return;

    const addOrUpdateData = () => {
      const source = instance.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(mapData as GeoJSON.FeatureCollection);
      } else {
        instance.addSource(SOURCE_ID, {
          type: "geojson",
          data: mapData as GeoJSON.FeatureCollection,
        });
        instance.addLayer({
          id: FILL_LAYER_ID,
          type: "fill",
          source: SOURCE_ID,
          paint: {
            "fill-color": getMapLibreScoreExpression(categoryId),
            "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.78, 0.55],
          },
        });
        instance.addLayer({
          id: LINE_LAYER_ID,
          type: "line",
          source: SOURCE_ID,
          paint: {
            "line-color": ["case", ["boolean", ["feature-state", "hover"], false], "#0f172a", "#1f2937"],
            "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2.4, 0.8],
            "line-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0.7],
          },
        });
      }
      upsertGeoJsonSource(instance, FACILITY_SOURCE_ID, facilityData);
      if (!instance.getLayer(FACILITY_LAYER_ID)) {
        instance.addLayer({
          id: FACILITY_LAYER_ID,
          type: "circle",
          source: FACILITY_SOURCE_ID,
          paint: {
            "circle-radius": ["case", ["boolean", ["feature-state", "hover"], false], 7.2, 4.8],
            "circle-color": getFacilityColorExpression(),
            "circle-stroke-width": 1.4,
            "circle-stroke-color": "#ffffff",
            "circle-opacity": 0.95,
          },
        });
      }
      instance.setPaintProperty(FILL_LAYER_ID, "fill-color", getMapLibreScoreExpression(categoryId));
      setLayersReady(true);
      const bounds = getGeoJsonBounds(mapData);
      if (bounds) instance.fitBounds(bounds, { padding: 32, duration: 0, maxZoom: 11 });
    };

    if (instance.isStyleLoaded()) addOrUpdateData();
    else instance.once("load", addOrUpdateData);
  }, [mapData, facilityData, categoryId]);

  useEffect(() => {
    const instance = mapRef.current;
    if (!instance || !layersReady || !instance.getLayer(FILL_LAYER_ID)) return;

    const onMove = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) return;
      if (hoveredIdRef.current !== null) {
        instance.setFeatureState({ source: SOURCE_ID, id: hoveredIdRef.current }, { hover: false });
      }
      const featureId = feature.id ?? feature.properties?.district_code ?? feature.properties?.district_name;
      if (featureId !== undefined) {
        hoveredIdRef.current = featureId;
        instance.setFeatureState({ source: SOURCE_ID, id: featureId }, { hover: true });
      }
      instance.getCanvas().style.cursor = "pointer";
      setTooltip({
        point: event.point,
        districtName: String(feature.properties?.district_name ?? "구 이름 없음"),
        scoreLabel:
          typeof feature.properties?.selected_score === "number"
            ? `${category.label} ${Number(feature.properties.selected_score).toFixed(1)}점`
            : "점수 없음",
      });
    };

    const onLeave = () => {
      if (hoveredIdRef.current !== null) {
        instance.setFeatureState({ source: SOURCE_ID, id: hoveredIdRef.current }, { hover: false });
        hoveredIdRef.current = null;
      }
      instance.getCanvas().style.cursor = "";
      setTooltip(null);
    };

    const onClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const districtId = feature?.properties?.district_code || feature?.properties?.district_name;
      if (districtId) navigate(`/district/${encodeURIComponent(String(districtId))}`);
    };

    const onFacilityMove = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) return;
      if (hoveredFacilityIdRef.current !== null) {
        instance.setFeatureState({ source: FACILITY_SOURCE_ID, id: hoveredFacilityIdRef.current }, { hover: false });
      }
      const id = feature.id;
      if (id !== undefined) {
        hoveredFacilityIdRef.current = id;
        instance.setFeatureState({ source: FACILITY_SOURCE_ID, id }, { hover: true });
      }
      instance.getCanvas().style.cursor = "pointer";
    };

    const onFacilityLeave = () => {
      if (hoveredFacilityIdRef.current !== null) {
        instance.setFeatureState({ source: FACILITY_SOURCE_ID, id: hoveredFacilityIdRef.current }, { hover: false });
        hoveredFacilityIdRef.current = null;
      }
      instance.getCanvas().style.cursor = "";
    };

    const onFacilityClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) return;
      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup()
        .setLngLat(event.lngLat)
        .setHTML(facilityPopupHtml(feature.properties ?? {}))
        .addTo(instance);
    };

    instance.on("mousemove", FILL_LAYER_ID, onMove);
    instance.on("mouseleave", FILL_LAYER_ID, onLeave);
    instance.on("click", FILL_LAYER_ID, onClick);
    instance.on("mousemove", FACILITY_LAYER_ID, onFacilityMove);
    instance.on("mouseleave", FACILITY_LAYER_ID, onFacilityLeave);
    instance.on("click", FACILITY_LAYER_ID, onFacilityClick);
    return () => {
      instance.off("mousemove", FILL_LAYER_ID, onMove);
      instance.off("mouseleave", FILL_LAYER_ID, onLeave);
      instance.off("click", FILL_LAYER_ID, onClick);
      instance.off("mousemove", FACILITY_LAYER_ID, onFacilityMove);
      instance.off("mouseleave", FACILITY_LAYER_ID, onFacilityLeave);
      instance.off("click", FACILITY_LAYER_ID, onFacilityClick);
    };
  }, [category.label, layersReady, navigate]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4">
        <div>
          <h2 className="text-base font-semibold text-slate-950">서울 25개 구 점수 지도</h2>
          <p className="mt-1 text-sm text-slate-500">
            현재 기준: {category.label}. 구 색상은 유모차 생활보행 점수이며, 카테고리 선택 시 해당 주요 생활시설 위치가 점으로 표시됩니다.
          </p>
        </div>
      </div>
      <div className="relative">
        <div ref={containerRef} className="h-[560px] w-full" />
        {basemapError ? <BasemapErrorBanner /> : null}
        {categoryId !== "overall" ? (
          <div className="absolute right-4 top-4 w-44">
            <FacilityLegend categories={[categoryId as CategoryId]} />
          </div>
        ) : null}
        {tooltip ? <MapTooltip {...tooltip} /> : null}
      </div>
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
        <ScoreLegend categoryId={categoryId} layout="compact" />
      </div>
    </div>
  );
}

function upsertGeoJsonSource(map: maplibregl.Map, id: string, data: GeoJsonFeatureCollection) {
  const source = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
  if (source) source.setData(data as GeoJSON.FeatureCollection);
  else map.addSource(id, { type: "geojson", data: data as GeoJSON.FeatureCollection });
}

function getFacilityColorExpression(): maplibregl.ExpressionSpecification {
  return [
    "match",
    ["get", "category"],
    "medical",
    FACILITY_CATEGORY_COLORS.medical,
    "administration",
    FACILITY_CATEGORY_COLORS.administration,
    "education",
    FACILITY_CATEGORY_COLORS.education,
    "leisure",
    FACILITY_CATEGORY_COLORS.leisure,
    "#64748b",
  ];
}

function facilityPopupHtml(props: Record<string, unknown>) {
  const category = normalizeCategory(props.category);
  return `
    <div style="font-size:12px;line-height:1.55">
      <strong>${escapeHtml(readString(props.facility_name) || "시설명 없음")}</strong><br/>
      카테고리: ${category ? CATEGORY_LABELS[category] : "카테고리 없음"}<br/>
      시설 유형: ${escapeHtml(getFacilityTypeLabel(readString(props.facility_type)))}<br/>
      원본 데이터명: ${escapeHtml(readString(props.source_name) || "정보 없음")}<br/>
      ${readString(props.address) ? `주소: ${escapeHtml(readString(props.address))}` : ""}
    </div>
  `;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] ?? char);
}

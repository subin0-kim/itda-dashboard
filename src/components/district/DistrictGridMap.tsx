import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type MapLayerMouseEvent } from "maplibre-gl";
import { BASE_MAP_STYLE, DEFAULT_MAP_BOUNDS, DEFAULT_SEOUL_CENTER, DEFAULT_SEOUL_ZOOM } from "../../config/mapStyle";
import { useBasemapStatus } from "../../hooks/useBasemapStatus";
import type { CategoryId } from "../../types/data";
import type { GeoJsonFeatureCollection } from "../../types/geojson";
import type { OverviewCategoryId } from "../../utils/category";
import { CATEGORY_LABELS, getFacilityTypeLabel, getOverviewCategory } from "../../utils/category";
import { getMapLibreScoreExpression } from "../../utils/colorScales";
import { enrichGridScores, filterFacilities, normalizeCategory, readString } from "../../utils/district";
import { getBoundsForMap } from "../../utils/mapBounds";
import { EmptyState } from "../layout/EmptyState";
import { BasemapErrorBanner } from "../map/BasemapErrorBanner";
import { DISTRICT_BOUNDARY_FILL_LAYER_ID, DISTRICT_BOUNDARY_LINE_LAYER_ID, DISTRICT_BOUNDARY_SOURCE_ID } from "../map/DistrictBoundaryLayer";
import { FacilityLegend, FACILITY_CATEGORY_COLORS } from "../map/FacilityLegend";
import { DISTRICT_FACILITY_LAYER_ID, DISTRICT_FACILITY_SOURCE_ID } from "../map/FacilityPointLayer";
import { DISTRICT_GRID_FILL_LAYER_ID, DISTRICT_GRID_LINE_LAYER_ID, DISTRICT_GRID_SOURCE_ID } from "../map/GridHeatmapLayer";
import { ScoreLegend } from "../map/ScoreLegend";

import "maplibre-gl/dist/maplibre-gl.css";

interface DistrictGridMapProps {
  boundary: GeoJsonFeatureCollection;
  grids: GeoJsonFeatureCollection;
  facilities: GeoJsonFeatureCollection;
  categoryId: OverviewCategoryId;
  selectedFacilityTypes: string[];
}

export function DistrictGridMap({ boundary, grids, facilities, categoryId, selectedFacilityTypes }: DistrictGridMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const hoveredGridId = useRef<string | number | null>(null);
  const hoveredFacilityId = useRef<string | number | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const basemapError = useBasemapStatus(map);
  const category = getOverviewCategory(categoryId);

  const gridData = useMemo(() => enrichGridScores(grids, categoryId), [grids, categoryId]);
  const facilityData = useMemo(
    () => filterFacilities(facilities, categoryId, selectedFacilityTypes),
    [facilities, categoryId, selectedFacilityTypes],
  );
  const canRenderMap = boundary.features.length > 0;
  const hasGrid = grids.features.length > 0;

  useEffect(() => {
    if (!canRenderMap) return;
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
  }, [canRenderMap]);

  useEffect(() => {
    if (!canRenderMap) return;
    const instance = mapRef.current;
    if (!instance) return;

    const applyData = () => {
      upsertGeoJsonSource(instance, DISTRICT_BOUNDARY_SOURCE_ID, boundary);
      upsertGeoJsonSource(instance, DISTRICT_GRID_SOURCE_ID, hasGrid ? gridData : EMPTY_COLLECTION);
      upsertGeoJsonSource(instance, DISTRICT_FACILITY_SOURCE_ID, facilityData);

      if (!instance.getLayer(DISTRICT_BOUNDARY_FILL_LAYER_ID)) {
        instance.addLayer({
          id: DISTRICT_BOUNDARY_FILL_LAYER_ID,
          type: "fill",
          source: DISTRICT_BOUNDARY_SOURCE_ID,
          paint: { "fill-color": "#ffffff", "fill-opacity": 0.05 },
        });
      }
      if (!instance.getLayer(DISTRICT_GRID_FILL_LAYER_ID)) {
        instance.addLayer({
          id: DISTRICT_GRID_FILL_LAYER_ID,
          type: "fill",
          source: DISTRICT_GRID_SOURCE_ID,
          paint: {
            "fill-color": getMapLibreScoreExpression(categoryId),
            "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.85, 0.62],
          },
        });
      }
      if (!instance.getLayer(DISTRICT_GRID_LINE_LAYER_ID)) {
        instance.addLayer({
          id: DISTRICT_GRID_LINE_LAYER_ID,
          type: "line",
          source: DISTRICT_GRID_SOURCE_ID,
          paint: {
            "line-color": ["case", ["boolean", ["feature-state", "hover"], false], "#0f172a", "rgba(255,255,255,0.45)"],
            "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 1.8, 0.35],
          },
        });
      }
      if (!instance.getLayer(DISTRICT_FACILITY_LAYER_ID)) {
        instance.addLayer({
          id: DISTRICT_FACILITY_LAYER_ID,
          type: "circle",
          source: DISTRICT_FACILITY_SOURCE_ID,
          paint: {
            "circle-radius": ["case", ["boolean", ["feature-state", "hover"], false], 7, 5],
            "circle-color": getFacilityColorExpression(),
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#ffffff",
            "circle-opacity": 0.95,
          },
        });
      }
      if (!instance.getLayer(DISTRICT_BOUNDARY_LINE_LAYER_ID)) {
        instance.addLayer({
          id: DISTRICT_BOUNDARY_LINE_LAYER_ID,
          type: "line",
          source: DISTRICT_BOUNDARY_SOURCE_ID,
          paint: { "line-color": "#0f172a", "line-width": 2.4, "line-opacity": 0.85 },
        });
      }

      instance.setPaintProperty(DISTRICT_GRID_FILL_LAYER_ID, "fill-color", getMapLibreScoreExpression(categoryId));
      setVisibility(instance, DISTRICT_GRID_FILL_LAYER_ID, hasGrid);
      setVisibility(instance, DISTRICT_GRID_LINE_LAYER_ID, hasGrid);
      if (instance.getLayer(DISTRICT_FACILITY_LAYER_ID)) {
        instance.setLayoutProperty(DISTRICT_FACILITY_LAYER_ID, "visibility", "visible");
        instance.moveLayer(DISTRICT_FACILITY_LAYER_ID);
      }

      const bounds = getBoundsForMap(boundary);
      if (bounds) instance.fitBounds(bounds, { padding: 36, duration: 0, maxZoom: 13 });
      setReady(true);
    };

    if (instance.isStyleLoaded()) applyData();
    else instance.once("load", applyData);
  }, [boundary, gridData, facilityData, categoryId, canRenderMap, hasGrid]);

  useEffect(() => {
    const instance = mapRef.current;
    if (!canRenderMap || !instance || !ready) return;

    const onGridMove = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) return;
      if (hoveredGridId.current !== null) {
        instance.setFeatureState({ source: DISTRICT_GRID_SOURCE_ID, id: hoveredGridId.current }, { hover: false });
      }
      const id = feature.id ?? feature.properties?.grid_id;
      if (id !== undefined) {
        hoveredGridId.current = id;
        instance.setFeatureState({ source: DISTRICT_GRID_SOURCE_ID, id }, { hover: true });
      }
      instance.getCanvas().style.cursor = "pointer";
      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false })
        .setLngLat(event.lngLat)
        .setHTML(gridTooltipHtml(feature.properties ?? {}, category.label))
        .addTo(instance);
    };

    const onGridLeave = () => {
      if (hoveredGridId.current !== null) {
        instance.setFeatureState({ source: DISTRICT_GRID_SOURCE_ID, id: hoveredGridId.current }, { hover: false });
        hoveredGridId.current = null;
      }
      instance.getCanvas().style.cursor = "";
      popupRef.current?.remove();
    };

    const onFacilityMove = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) return;
      if (hoveredFacilityId.current !== null) {
        instance.setFeatureState({ source: DISTRICT_FACILITY_SOURCE_ID, id: hoveredFacilityId.current }, { hover: false });
      }
      const id = feature.id;
      if (id !== undefined) {
        hoveredFacilityId.current = id;
        instance.setFeatureState({ source: DISTRICT_FACILITY_SOURCE_ID, id }, { hover: true });
      }
      instance.getCanvas().style.cursor = "pointer";
    };

    const onFacilityLeave = () => {
      if (hoveredFacilityId.current !== null) {
        instance.setFeatureState({ source: DISTRICT_FACILITY_SOURCE_ID, id: hoveredFacilityId.current }, { hover: false });
        hoveredFacilityId.current = null;
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

    instance.on("mousemove", DISTRICT_GRID_FILL_LAYER_ID, onGridMove);
    instance.on("mouseleave", DISTRICT_GRID_FILL_LAYER_ID, onGridLeave);
    instance.on("mousemove", DISTRICT_FACILITY_LAYER_ID, onFacilityMove);
    instance.on("mouseleave", DISTRICT_FACILITY_LAYER_ID, onFacilityLeave);
    instance.on("click", DISTRICT_FACILITY_LAYER_ID, onFacilityClick);
    return () => {
      instance.off("mousemove", DISTRICT_GRID_FILL_LAYER_ID, onGridMove);
      instance.off("mouseleave", DISTRICT_GRID_FILL_LAYER_ID, onGridLeave);
      instance.off("mousemove", DISTRICT_FACILITY_LAYER_ID, onFacilityMove);
      instance.off("mouseleave", DISTRICT_FACILITY_LAYER_ID, onFacilityLeave);
      instance.off("click", DISTRICT_FACILITY_LAYER_ID, onFacilityClick);
    };
  }, [category.label, ready, canRenderMap]);

  if (boundary.features.length === 0) {
    return <EmptyState title="데이터 준비 필요" message="서울 구 경계 데이터가 필요합니다." />;
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-slate-950">구 상세 지도</h2>
        <p className="mt-1 text-sm text-slate-500">
          현재 기준: {category.label}. 격자 색상은 유모차 생활보행 점수, 점은 주요 생활시설의 실제 위치를 나타냅니다.
        </p>
      </div>
      <div className="relative overflow-hidden rounded-lg border border-slate-200">
        <div ref={containerRef} className="h-[620px] w-full" />
        {basemapError ? <BasemapErrorBanner /> : null}
        <div className="absolute right-4 top-4 w-44">
          <FacilityLegend categories={categoryId === "overall" ? undefined : [categoryId as CategoryId]} />
        </div>
      </div>
      <div className="mt-3">
        <ScoreLegend categoryId={categoryId} layout="compact" />
      </div>
      {!hasGrid ? (
        <p className="mt-3 text-sm text-slate-500">250m 격자 점수 데이터가 필요합니다. 베이스맵과 선택 구 경계만 표시합니다.</p>
      ) : null}
      {categoryId !== "overall" && facilityData.features.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">선택한 구의 시설 위치 데이터가 없습니다.</p>
      ) : null}
    </section>
  );
}

const EMPTY_COLLECTION: GeoJsonFeatureCollection = { type: "FeatureCollection", features: [] };

function upsertGeoJsonSource(map: maplibregl.Map, id: string, data: GeoJsonFeatureCollection) {
  const source = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
  if (source) source.setData(data as GeoJSON.FeatureCollection);
  else map.addSource(id, { type: "geojson", data: data as GeoJSON.FeatureCollection });
}

function setVisibility(map: maplibregl.Map, layerId: string, visible: boolean) {
  if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
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

function gridTooltipHtml(props: Record<string, unknown>, categoryLabel: string) {
  return `
    <div style="font-size:12px;line-height:1.55">
      <strong>${escapeHtml(readString(props.grid_id) || "격자 ID 없음")}</strong><br/>
      ${categoryLabel}: ${formatPopupScore(props.selected_score)}<br/>
      통합: ${formatPopupScore(props.overall_score)}<br/>
      ${formatLivingWeight(props.living_weight)}
      의료: ${formatPopupScore(props.medical_score)}<br/>
      행정: ${formatPopupScore(props.admin_score)}<br/>
      교육: ${formatPopupScore(props.education_score)}<br/>
      여가: ${formatPopupScore(props.leisure_score)}
    </div>
  `;
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

function formatPopupScore(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return `${value.toFixed(1)}점`;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return `${Number(value).toFixed(1)}점`;
  return "계산 불가";
}

function formatLivingWeight(value: unknown) {
  const numeric = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  if (!Number.isFinite(numeric)) return "";
  return `생활 출발지 가중치: ${numeric.toFixed(2)}<br/>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] ?? char);
}

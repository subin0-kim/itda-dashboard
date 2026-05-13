import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import maplibregl, { type MapLayerMouseEvent } from "maplibre-gl";
import { useNavigate } from "react-router-dom";
import { BASE_MAP_STYLE, DEFAULT_MAP_BOUNDS, DEFAULT_SEOUL_CENTER, DEFAULT_SEOUL_ZOOM } from "../../config/mapStyle";
import { useBasemapStatus } from "../../hooks/useBasemapStatus";
import type { CategoryId, DistrictScore } from "../../types/data";
import type { GeoJsonFeatureCollection } from "../../types/geojson";
import { getOverviewCategory, getFacilityTypeLabel, CATEGORY_LABELS } from "../../utils/category";
import { getMapLibreScoreExpression } from "../../utils/colorScales";
import { enrichGridScores, filterFacilities, normalizeCategory, readString } from "../../utils/district";
import { mergeDistrictScores, getGeoJsonBounds } from "../../utils/geojson";
import { EmptyState } from "../layout/EmptyState";
import { BasemapErrorBanner } from "../map/BasemapErrorBanner";
import { CATEGORY_DISTRICT_FILL_LAYER_ID, CATEGORY_DISTRICT_LINE_LAYER_ID, CATEGORY_DISTRICT_SOURCE_ID } from "../map/CategoryDistrictLayer";
import { CATEGORY_FACILITY_LAYER_ID, CATEGORY_FACILITY_SOURCE_ID } from "../map/CategoryFacilityLayer";
import { CATEGORY_GRID_FILL_LAYER_ID, CATEGORY_GRID_LINE_LAYER_ID, CATEGORY_GRID_SOURCE_ID } from "../map/CategoryGridLayer";
import { FacilityLegend, FACILITY_CATEGORY_COLORS } from "../map/FacilityLegend";
import { ScoreLegend } from "../map/ScoreLegend";

import "maplibre-gl/dist/maplibre-gl.css";

export type CategoryMapViewMode = "district" | "grid";

interface CategoryMapProps {
  categoryId: CategoryId;
  viewMode: CategoryMapViewMode;
  onViewModeChange: (mode: CategoryMapViewMode) => void;
  districts: GeoJsonFeatureCollection;
  districtScores: DistrictScore[];
  grids: GeoJsonFeatureCollection;
  facilities: GeoJsonFeatureCollection;
  selectedFacilityTypes: string[];
}

export function CategoryMap({
  categoryId,
  viewMode,
  onViewModeChange,
  districts,
  districtScores,
  grids,
  facilities,
  selectedFacilityTypes,
}: CategoryMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const hoveredDistrictId = useRef<string | number | null>(null);
  const hoveredGridId = useRef<string | number | null>(null);
  const hoveredFacilityId = useRef<string | number | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const basemapError = useBasemapStatus(map);
  const navigate = useNavigate();
  const category = getOverviewCategory(categoryId);

  const districtData = useMemo(() => mergeDistrictScores(districts, districtScores, categoryId), [districts, districtScores, categoryId]);
  const gridData = useMemo(
    () => (viewMode === "grid" ? enrichGridScores(grids, categoryId) : { ...grids, features: [] }),
    [grids, categoryId, viewMode],
  );
  const facilityData = useMemo(
    () => filterFacilities(facilities, categoryId, selectedFacilityTypes),
    [facilities, categoryId, selectedFacilityTypes],
  );
  const canRender = districts.features.length > 0;

  useEffect(() => {
    if (!canRender) return;
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
  }, [canRender]);

  useEffect(() => {
    if (!canRender) return;
    const instance = mapRef.current;
    if (!instance) return;

    const applyData = () => {
      upsertGeoJsonSource(instance, CATEGORY_DISTRICT_SOURCE_ID, districtData);
      upsertGeoJsonSource(instance, CATEGORY_GRID_SOURCE_ID, gridData);
      upsertGeoJsonSource(instance, CATEGORY_FACILITY_SOURCE_ID, facilityData);

      if (!instance.getLayer(CATEGORY_DISTRICT_FILL_LAYER_ID)) {
        instance.addLayer({
          id: CATEGORY_DISTRICT_FILL_LAYER_ID,
          type: "fill",
          source: CATEGORY_DISTRICT_SOURCE_ID,
          paint: {
            "fill-color": getMapLibreScoreExpression(categoryId),
            "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.78, 0.55],
          },
        });
      }
      if (!instance.getLayer(CATEGORY_GRID_FILL_LAYER_ID)) {
        instance.addLayer({
          id: CATEGORY_GRID_FILL_LAYER_ID,
          type: "fill",
          source: CATEGORY_GRID_SOURCE_ID,
          paint: {
            "fill-color": getMapLibreScoreExpression(categoryId),
            "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.82, 0.6],
          },
        });
      }
      if (!instance.getLayer(CATEGORY_GRID_LINE_LAYER_ID)) {
        instance.addLayer({
          id: CATEGORY_GRID_LINE_LAYER_ID,
          type: "line",
          source: CATEGORY_GRID_SOURCE_ID,
          paint: {
            "line-color": ["case", ["boolean", ["feature-state", "hover"], false], "#0f172a", "rgba(255,255,255,0.4)"],
            "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 1.4, 0.3],
          },
        });
      }
      if (!instance.getLayer(CATEGORY_FACILITY_LAYER_ID)) {
        instance.addLayer({
          id: CATEGORY_FACILITY_LAYER_ID,
          type: "circle",
          source: CATEGORY_FACILITY_SOURCE_ID,
          paint: {
            "circle-radius": ["case", ["boolean", ["feature-state", "hover"], false], 6.8, 4.6],
            "circle-color": getFacilityColorExpression(),
            "circle-stroke-width": 1.2,
            "circle-stroke-color": "#ffffff",
            "circle-opacity": 0.95,
          },
        });
      }
      if (!instance.getLayer(CATEGORY_DISTRICT_LINE_LAYER_ID)) {
        instance.addLayer({
          id: CATEGORY_DISTRICT_LINE_LAYER_ID,
          type: "line",
          source: CATEGORY_DISTRICT_SOURCE_ID,
          paint: {
            "line-color": ["case", ["boolean", ["feature-state", "hover"], false], "#0f172a", "#1f2937"],
            "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2.4, 0.9],
            "line-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0.75],
          },
        });
      }

      instance.setPaintProperty(CATEGORY_DISTRICT_FILL_LAYER_ID, "fill-color", getMapLibreScoreExpression(categoryId));
      instance.setPaintProperty(CATEGORY_GRID_FILL_LAYER_ID, "fill-color", getMapLibreScoreExpression(categoryId));
      if (instance.getLayer(CATEGORY_FACILITY_LAYER_ID)) {
        instance.setLayoutProperty(CATEGORY_FACILITY_LAYER_ID, "visibility", "visible");
        instance.moveLayer(CATEGORY_FACILITY_LAYER_ID);
      }
      setLayerVisibility(instance, viewMode, grids.features.length > 0);
      const bounds = getGeoJsonBounds(districtData);
      if (bounds) instance.fitBounds(bounds, { padding: 32, duration: 0, maxZoom: 11 });
      setReady(true);
    };

    if (instance.isStyleLoaded()) applyData();
    else instance.once("load", applyData);
  }, [canRender, districtData, gridData, facilityData, categoryId, viewMode, grids.features.length]);

  useEffect(() => {
    const instance = mapRef.current;
    if (!instance || !ready) return;
    setLayerVisibility(instance, viewMode, grids.features.length > 0);
  }, [viewMode, grids.features.length, ready]);

  useEffect(() => {
    const instance = mapRef.current;
    if (!instance || !ready) return;

    const onDistrictMove = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) return;
      setHoverState(instance, CATEGORY_DISTRICT_SOURCE_ID, hoveredDistrictId, feature.id ?? feature.properties?.district_code ?? feature.properties?.district_name);
      instance.getCanvas().style.cursor = "pointer";
      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false })
        .setLngLat(event.lngLat)
        .setHTML(districtTooltipHtml(feature.properties ?? {}, category.label))
        .addTo(instance);
    };

    const onGridMove = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) return;
      setHoverState(instance, CATEGORY_GRID_SOURCE_ID, hoveredGridId, feature.id ?? feature.properties?.grid_id);
      instance.getCanvas().style.cursor = "pointer";
      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false })
        .setLngLat(event.lngLat)
        .setHTML(gridTooltipHtml(feature.properties ?? {}, category.label))
        .addTo(instance);
    };

    const onLeave = (sourceId: string, ref: MutableRefObject<string | number | null>) => {
      if (ref.current !== null) {
        instance.setFeatureState({ source: sourceId, id: ref.current }, { hover: false });
        ref.current = null;
      }
      instance.getCanvas().style.cursor = "";
      popupRef.current?.remove();
    };

    const onFacilityMove = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) return;
      if (hoveredFacilityId.current !== null) {
        instance.setFeatureState({ source: CATEGORY_FACILITY_SOURCE_ID, id: hoveredFacilityId.current }, { hover: false });
      }
      const id = feature.id;
      if (id !== undefined) {
        hoveredFacilityId.current = id;
        instance.setFeatureState({ source: CATEGORY_FACILITY_SOURCE_ID, id }, { hover: true });
      }
      instance.getCanvas().style.cursor = "pointer";
    };

    const onFacilityLeave = () => {
      if (hoveredFacilityId.current !== null) {
        instance.setFeatureState({ source: CATEGORY_FACILITY_SOURCE_ID, id: hoveredFacilityId.current }, { hover: false });
        hoveredFacilityId.current = null;
      }
      instance.getCanvas().style.cursor = "";
    };

    const onDistrictClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const districtId = feature?.properties?.district_code || feature?.properties?.district_name;
      if (districtId) navigate(`/district/${encodeURIComponent(String(districtId))}`);
    };

    const onFacilityClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) return;
      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup().setLngLat(event.lngLat).setHTML(facilityPopupHtml(feature.properties ?? {})).addTo(instance);
    };

    const onDistrictLeave = () => onLeave(CATEGORY_DISTRICT_SOURCE_ID, hoveredDistrictId);
    const onGridLeave = () => onLeave(CATEGORY_GRID_SOURCE_ID, hoveredGridId);

    instance.on("mousemove", CATEGORY_DISTRICT_FILL_LAYER_ID, onDistrictMove);
    instance.on("mouseleave", CATEGORY_DISTRICT_FILL_LAYER_ID, onDistrictLeave);
    instance.on("click", CATEGORY_DISTRICT_FILL_LAYER_ID, onDistrictClick);
    instance.on("mousemove", CATEGORY_GRID_FILL_LAYER_ID, onGridMove);
    instance.on("mouseleave", CATEGORY_GRID_FILL_LAYER_ID, onGridLeave);
    instance.on("mousemove", CATEGORY_FACILITY_LAYER_ID, onFacilityMove);
    instance.on("mouseleave", CATEGORY_FACILITY_LAYER_ID, onFacilityLeave);
    instance.on("click", CATEGORY_FACILITY_LAYER_ID, onFacilityClick);
    return () => {
      instance.off("mousemove", CATEGORY_DISTRICT_FILL_LAYER_ID, onDistrictMove);
      instance.off("mouseleave", CATEGORY_DISTRICT_FILL_LAYER_ID, onDistrictLeave);
      instance.off("click", CATEGORY_DISTRICT_FILL_LAYER_ID, onDistrictClick);
      instance.off("mousemove", CATEGORY_GRID_FILL_LAYER_ID, onGridMove);
      instance.off("mouseleave", CATEGORY_GRID_FILL_LAYER_ID, onGridLeave);
      instance.off("mousemove", CATEGORY_FACILITY_LAYER_ID, onFacilityMove);
      instance.off("mouseleave", CATEGORY_FACILITY_LAYER_ID, onFacilityLeave);
      instance.off("click", CATEGORY_FACILITY_LAYER_ID, onFacilityClick);
    };
  }, [category.label, navigate, ready]);

  if (districts.features.length === 0) {
    return <EmptyState title="데이터 준비 필요" message="서울 구 경계 데이터가 필요합니다." />;
  }

  const categoryFilterIds = [categoryId];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">카테고리 지도</h2>
          <p className="mt-1 text-sm text-slate-500">
            베이스맵 위에 구별 점수, 250m 격자 점수, 시설 위치가 함께 표시됩니다. 격자 색상은 유모차 생활보행 점수, 점은 주요 생활시설의 실제 위치입니다.
          </p>
        </div>
        <div className="inline-flex rounded-md border border-slate-200 bg-white p-1">
          <ModeButton active={viewMode === "district"} onClick={() => onViewModeChange("district")} label="구별 보기" />
          <ModeButton active={viewMode === "grid"} onClick={() => onViewModeChange("grid")} label="격자 보기" disabled={grids.features.length === 0} />
        </div>
      </div>
      <div className="relative overflow-hidden rounded-lg border border-slate-200">
        <div ref={containerRef} className="h-[620px] w-full" />
        {basemapError ? <BasemapErrorBanner /> : null}
        <div className="absolute right-4 top-4 w-44">
          <FacilityLegend categories={categoryFilterIds} />
        </div>
      </div>
      <div className="mt-3">
        <ScoreLegend categoryId={categoryId} layout="compact" />
      </div>
      {viewMode === "grid" && grids.features.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">250m 격자 점수 데이터가 필요합니다.</p>
      ) : null}
      {facilityData.features.length === 0 ? <p className="mt-3 text-sm text-slate-500">선택 카테고리 시설 데이터가 없습니다.</p> : null}
    </section>
  );
}

function ModeButton({ active, label, onClick, disabled }: { active: boolean; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:text-slate-400",
        active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function upsertGeoJsonSource(map: maplibregl.Map, id: string, data: GeoJsonFeatureCollection) {
  const source = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
  if (source) source.setData(data as GeoJSON.FeatureCollection);
  else map.addSource(id, { type: "geojson", data: data as GeoJSON.FeatureCollection });
}

function setLayerVisibility(map: maplibregl.Map, viewMode: CategoryMapViewMode, hasGrid: boolean) {
  setVisibility(map, CATEGORY_DISTRICT_FILL_LAYER_ID, viewMode === "district");
  setVisibility(map, CATEGORY_GRID_FILL_LAYER_ID, viewMode === "grid" && hasGrid);
  setVisibility(map, CATEGORY_GRID_LINE_LAYER_ID, viewMode === "grid" && hasGrid);
  setVisibility(map, CATEGORY_FACILITY_LAYER_ID, true);
}

function setVisibility(map: maplibregl.Map, layerId: string, visible: boolean) {
  if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
}

function setHoverState(
  map: maplibregl.Map,
  source: string,
  ref: MutableRefObject<string | number | null>,
  id: string | number | undefined,
) {
  if (ref.current !== null) map.setFeatureState({ source, id: ref.current }, { hover: false });
  if (id !== undefined) {
    ref.current = id;
    map.setFeatureState({ source, id }, { hover: true });
  }
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

function districtTooltipHtml(props: Record<string, unknown>, label: string) {
  return `<div style="font-size:12px;line-height:1.55"><strong>${escapeHtml(readString(props.district_name) || "구 이름 없음")}</strong><br/>${label}: ${formatPopupScore(props.selected_score)}</div>`;
}

function gridTooltipHtml(props: Record<string, unknown>, label: string) {
  return `<div style="font-size:12px;line-height:1.55"><strong>${escapeHtml(readString(props.grid_id) || "격자 ID 없음")}</strong><br/>${escapeHtml(readString(props.district_name) || "")}<br/>${label}: ${formatPopupScore(props.selected_score)}</div>`;
}

function facilityPopupHtml(props: Record<string, unknown>) {
  const category = normalizeCategory(props.category);
  return `<div style="font-size:12px;line-height:1.55"><strong>${escapeHtml(readString(props.facility_name) || "시설명 없음")}</strong><br/>카테고리: ${category ? CATEGORY_LABELS[category] : "카테고리 없음"}<br/>시설 유형: ${escapeHtml(getFacilityTypeLabel(readString(props.facility_type)))}<br/>구 이름: ${escapeHtml(readString(props.district_name) || "정보 없음")}<br/>원본 데이터명: ${escapeHtml(readString(props.source_name) || "정보 없음")}<br/>${readString(props.address) ? `주소: ${escapeHtml(readString(props.address))}` : ""}</div>`;
}

function formatPopupScore(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return `${value.toFixed(1)}점`;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return `${Number(value).toFixed(1)}점`;
  return "계산 불가";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] ?? char);
}

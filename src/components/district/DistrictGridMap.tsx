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
  districtCode?: string | null;
}

export function DistrictGridMap({ boundary, grids, facilities, categoryId, selectedFacilityTypes, districtCode }: DistrictGridMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const hoveredGridId = useRef<string | number | null>(null);
  const hoveredFacilityId = useRef<string | number | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [showNetwork, setShowNetwork] = useState(true);
  const [networkData, setNetworkData] = useState<{ links: GeoJsonFeatureCollection | null; nodes: GeoJsonFeatureCollection | null; missing: boolean }>({
    links: null,
    nodes: null,
    missing: false,
  });
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
      ensureNetworkLayers(instance, networkData.links, networkData.nodes);

      instance.setPaintProperty(DISTRICT_GRID_FILL_LAYER_ID, "fill-color", getMapLibreScoreExpression(categoryId));
      instance.setPaintProperty(DISTRICT_GRID_FILL_LAYER_ID, "fill-opacity", [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        showNetwork ? 0.7 : 0.85,
        showNetwork ? 0.4 : 0.62,
      ]);
      setVisibility(instance, DISTRICT_GRID_FILL_LAYER_ID, hasGrid);
      setVisibility(instance, DISTRICT_GRID_LINE_LAYER_ID, hasGrid);
      if (instance.getLayer(DISTRICT_FACILITY_LAYER_ID)) {
        instance.setLayoutProperty(DISTRICT_FACILITY_LAYER_ID, "visibility", "visible");
        instance.moveLayer(DISTRICT_FACILITY_LAYER_ID);
      }
      setNetworkLayerVisibility(instance, showNetwork && Boolean(networkData.links));

      const bounds = getBoundsForMap(boundary);
      if (bounds) instance.fitBounds(bounds, { padding: 36, duration: 0, maxZoom: 13 });
      setReady(true);
    };

    if (instance.isStyleLoaded()) applyData();
    else instance.once("load", applyData);
  }, [boundary, gridData, facilityData, categoryId, canRenderMap, hasGrid, networkData.links, networkData.nodes, showNetwork]);

  useEffect(() => {
    if (!showNetwork || !districtCode) return;
    let cancelled = false;
    async function loadNetwork() {
      const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");
      const linksUrl = `${base}data/network/${districtCode}_links.geojson`;
      const nodesUrl = `${base}data/network/${districtCode}_nodes.geojson`;
      try {
        const [linksResponse, nodesResponse] = await Promise.all([fetch(linksUrl), fetch(nodesUrl)]);
        if (!linksResponse.ok || !nodesResponse.ok) {
          if (!cancelled) setNetworkData({ links: null, nodes: null, missing: true });
          return;
        }
        const [links, nodes] = await Promise.all([linksResponse.json(), nodesResponse.json()]);
        if (!cancelled) setNetworkData({ links, nodes, missing: false });
      } catch {
        if (!cancelled) setNetworkData({ links: null, nodes: null, missing: true });
      }
    }
    loadNetwork();
    return () => {
      cancelled = true;
    };
  }, [showNetwork, districtCode]);

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
          현재 기준: {category.label}. 격자 색상은 생활 출발지 가중치를 반영한 점수, 점은 주요 생활시설의 실제 위치를 나타냅니다.
        </p>
      </div>
      <div className="relative overflow-hidden rounded-lg border border-slate-200">
        <div ref={containerRef} className="h-[620px] w-full" />
        {basemapError ? <BasemapErrorBanner /> : null}
        <div className="absolute right-4 bottom-10 max-w-[220px] rounded-md border border-slate-200 bg-white/95 p-2 shadow-sm">
          <button
            type="button"
            onClick={() => setShowNetwork((value) => !value)}
            className="block w-full rounded px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {showNetwork ? "보행 네트워크 숨기기" : "보행 네트워크 보기"}
          </button>
          {showNetwork && networkData.links ? (
            <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-[11px] leading-tight text-slate-600">
              <div className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-3.5 bg-[#1d4ed8]" />도보 네트워크 링크</div>
              <div className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-3.5 bg-[#f97316]" />횡단보도 보조 링크</div>
              <p className="text-[10px] text-slate-500">노드는 확대 시 표시됩니다.</p>
            </div>
          ) : null}
        </div>
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
      {showNetwork && networkData.missing ? (
        <p className="mt-3 text-sm text-slate-500">보행 네트워크 데이터가 없습니다. 현재 산출물은 직선거리 fallback을 사용할 수 있습니다.</p>
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

const NETWORK_LINK_SOURCE_ID = "district-network-links";
const NETWORK_NODE_SOURCE_ID = "district-network-nodes";
const NETWORK_LINK_LAYER_ID = "district-network-link-layer";
const NETWORK_NODE_LAYER_ID = "district-network-node-layer";

function ensureNetworkLayers(
  map: maplibregl.Map,
  links: GeoJsonFeatureCollection | null,
  nodes: GeoJsonFeatureCollection | null,
) {
  if (!links) return;
  const beforeId = map.getLayer(DISTRICT_GRID_FILL_LAYER_ID) ? DISTRICT_GRID_FILL_LAYER_ID : undefined;
  upsertGeoJsonSource(map, NETWORK_LINK_SOURCE_ID, links);
  if (!map.getLayer(NETWORK_LINK_LAYER_ID)) {
    map.addLayer(
      {
        id: NETWORK_LINK_LAYER_ID,
        type: "line",
        source: NETWORK_LINK_SOURCE_ID,
        layout: { visibility: "none" },
        paint: {
          "line-color": ["match", ["get", "source_service"], "tbTraficCrsng", "#f97316", "#1d4ed8"],
          "line-width": ["match", ["get", "source_service"], "tbTraficCrsng", 1.6, 0.9],
          "line-opacity": 0.78,
        },
      },
      beforeId,
    );
  } else {
    map.moveLayer(NETWORK_LINK_LAYER_ID, beforeId);
  }
  if (nodes) {
    upsertGeoJsonSource(map, NETWORK_NODE_SOURCE_ID, nodes);
    if (!map.getLayer(NETWORK_NODE_LAYER_ID)) {
      map.addLayer(
        {
          id: NETWORK_NODE_LAYER_ID,
          type: "circle",
          source: NETWORK_NODE_SOURCE_ID,
          minzoom: 13,
          layout: { visibility: "none" },
          paint: { "circle-radius": 2.2, "circle-color": "#1e293b", "circle-stroke-width": 0.6, "circle-stroke-color": "#ffffff", "circle-opacity": 0.85 },
        },
        beforeId,
      );
    } else {
      map.moveLayer(NETWORK_NODE_LAYER_ID, beforeId);
    }
  }
}

function setNetworkLayerVisibility(map: maplibregl.Map, visible: boolean) {
  setVisibility(map, NETWORK_LINK_LAYER_ID, visible);
  setVisibility(map, NETWORK_NODE_LAYER_ID, visible);
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
      ${categoryLabel} 가중 반영: ${formatPopupScore(props.selected_score)}<br/>
      ${categoryLabel} 원점수: ${formatPopupScore(props.selected_raw_score)}<br/>
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

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type MapLayerMouseEvent } from "maplibre-gl";
import { useNavigate } from "react-router-dom";
import { BASE_MAP_STYLE, DEFAULT_MAP_BOUNDS, DEFAULT_SEOUL_CENTER, DEFAULT_SEOUL_ZOOM } from "../../config/mapStyle";
import { useBasemapStatus } from "../../hooks/useBasemapStatus";
import type { DistrictScore } from "../../types/data";
import type { GeoJsonFeatureCollection } from "../../types/geojson";
import type { OverviewCategoryId } from "../../utils/category";
import { getOverviewCategory } from "../../utils/category";
import { getMapLibreScoreExpression } from "../../utils/colorScales";
import { getGeoJsonBounds, mergeDistrictScores } from "../../utils/geojson";
import { BasemapErrorBanner } from "./BasemapErrorBanner";
import { MapTooltip } from "./MapTooltip";
import { ScoreLegend } from "./ScoreLegend";

import "maplibre-gl/dist/maplibre-gl.css";

interface SeoulDistrictMapProps {
  districts: GeoJsonFeatureCollection;
  scores: DistrictScore[];
  categoryId: OverviewCategoryId;
}

const SOURCE_ID = "seoul-districts";
const FILL_LAYER_ID = "district-fill";
const LINE_LAYER_ID = "district-line";

export function SeoulDistrictMap({ districts, scores, categoryId }: SeoulDistrictMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hoveredIdRef = useRef<string | number | null>(null);
  const navigate = useNavigate();
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [layersReady, setLayersReady] = useState(false);
  const [tooltip, setTooltip] = useState<{ point: maplibregl.PointLike; districtName: string; scoreLabel: string } | null>(null);
  const basemapError = useBasemapStatus(map);
  const category = getOverviewCategory(categoryId);

  const mapData = useMemo(() => mergeDistrictScores(districts, scores, categoryId), [districts, scores, categoryId]);

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
      instance.setPaintProperty(FILL_LAYER_ID, "fill-color", getMapLibreScoreExpression(categoryId));
      setLayersReady(true);
      const bounds = getGeoJsonBounds(mapData);
      if (bounds) instance.fitBounds(bounds, { padding: 32, duration: 0, maxZoom: 11 });
    };

    if (instance.isStyleLoaded()) addOrUpdateData();
    else instance.once("load", addOrUpdateData);
  }, [mapData, categoryId]);

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

    instance.on("mousemove", FILL_LAYER_ID, onMove);
    instance.on("mouseleave", FILL_LAYER_ID, onLeave);
    instance.on("click", FILL_LAYER_ID, onClick);
    return () => {
      instance.off("mousemove", FILL_LAYER_ID, onMove);
      instance.off("mouseleave", FILL_LAYER_ID, onLeave);
      instance.off("click", FILL_LAYER_ID, onClick);
    };
  }, [category.label, layersReady, navigate]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4">
        <div>
          <h2 className="text-base font-semibold text-slate-950">서울 25개 구 점수 지도</h2>
          <p className="mt-1 text-sm text-slate-500">
            현재 기준: {category.label}. 구 색상은 유모차 생활보행 점수이며, 베이스맵은 도로·하천 등 도시 맥락을 보여줍니다. 구를 클릭하면 상세 화면으로 이동합니다.
          </p>
        </div>
      </div>
      <div className="relative">
        <div ref={containerRef} className="h-[560px] w-full" />
        {basemapError ? <BasemapErrorBanner /> : null}
        {tooltip ? <MapTooltip {...tooltip} /> : null}
      </div>
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
        <ScoreLegend categoryId={categoryId} layout="compact" />
      </div>
    </div>
  );
}

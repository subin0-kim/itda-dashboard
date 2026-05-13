import { useEffect, useRef, useState } from "react";
import type maplibregl from "maplibre-gl";

const ERROR_THRESHOLD = 3;
const ERROR_WINDOW_MS = 4000;

export function useBasemapStatus(map: maplibregl.Map | null) {
  const [hasBasemapError, setHasBasemapError] = useState(false);
  const errorTimestampsRef = useRef<number[]>([]);

  useEffect(() => {
    if (!map) return;
    const onError = (event: { error?: { status?: number; message?: string } }) => {
      const status = event?.error?.status;
      const message = String(event?.error?.message ?? "");
      const isTileError = (typeof status === "number" && status >= 400) || /tile|fetch/i.test(message);
      if (!isTileError) return;
      const now = Date.now();
      const recent = errorTimestampsRef.current.filter((ts) => now - ts < ERROR_WINDOW_MS);
      recent.push(now);
      errorTimestampsRef.current = recent;
      if (recent.length >= ERROR_THRESHOLD) setHasBasemapError(true);
    };
    map.on("error", onError);
    return () => {
      map.off("error", onError);
    };
  }, [map]);

  return hasBasemapError;
}

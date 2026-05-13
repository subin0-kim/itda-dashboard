import type { PointLike } from "maplibre-gl";

interface MapTooltipProps {
  point: PointLike;
  districtName: string;
  scoreLabel: string;
}

export function MapTooltip({ point, districtName, scoreLabel }: MapTooltipProps) {
  const x = Array.isArray(point) ? point[0] : point.x;
  const y = Array.isArray(point) ? point[1] : point.y;

  return (
    <div
      className="pointer-events-none absolute z-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg"
      style={{ left: x + 12, top: y + 12 }}
    >
      <div className="font-semibold text-slate-900">{districtName || "구 이름 없음"}</div>
      <div className="mt-1 text-slate-600">{scoreLabel}</div>
    </div>
  );
}

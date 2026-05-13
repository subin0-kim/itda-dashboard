import { Map } from "lucide-react";

interface DistrictMapPlaceholderProps {
  title?: string;
  description?: string;
}

export function DistrictMapPlaceholder({
  title = "지도 영역",
  description = "전처리된 GeoJSON을 기반으로 MapLibre 지도를 연결할 영역입니다.",
}: DistrictMapPlaceholderProps) {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-slate-200 bg-white">
      <div className="text-center text-slate-500">
        <Map className="mx-auto mb-3 text-slate-400" size={32} aria-hidden="true" />
        <div className="font-semibold text-slate-800">{title}</div>
        <p className="mt-2 max-w-md text-sm leading-6">{description}</p>
      </div>
    </div>
  );
}

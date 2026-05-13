import type { Metadata } from "../../types/data";

interface CoordinateSystemSectionProps {
  metadata: Metadata | null;
}

export function CoordinateSystemSection({ metadata }: CoordinateSystemSectionProps) {
  const systems = metadata?.coordinate_systems ? Object.entries(metadata.coordinate_systems) : [];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">좌표계와 거리 계산</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        거리 계산은 meter 단위 계산이 가능한 투영 좌표계에서 수행하고, 웹 지도 표시를 위해 EPSG:4326으로 변환합니다.
      </p>
      {systems.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">좌표계 정보가 metadata.json에 기록되어 있지 않습니다.</p>
      ) : (
        <dl className="mt-4 grid gap-2">
          {systems.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
              <dt className="text-slate-500">{key}</dt>
              <dd className="font-medium text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

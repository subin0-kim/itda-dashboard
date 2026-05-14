import type { Metadata } from "../../types/data";
import { readMetadataValue } from "../../utils/metadata";

interface PedestrianNetworkSectionProps {
  metadata: Metadata | null;
}

export function PedestrianNetworkSection({ metadata }: PedestrianNetworkSectionProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">보행 네트워크 기반 거리 계산</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
        <p>
          기본 직선거리 방식은 실제 보행 경로를 반영하지 못하는 한계가 있습니다. 본 프로젝트는 서울시 자치구별 도보
          네트워크 공간정보를 활용할 수 있는 경우, 격자 중심점과 주요 시설을 가장 가까운 도보 네트워크 노드에 연결하고
          노드-링크 그래프의 최단거리로 접근성 점수를 계산합니다.
        </p>
        <p>
          격자 중심점 또는 시설 좌표가 도보 네트워크 노드와 지나치게 멀리 떨어진 경우, 해당 지점은 네트워크 접근이 어렵다고
          판단하여 제외하거나 직선거리 대체로 처리합니다. 이 대체 여부는 전처리 metadata에 기록됩니다.
        </p>
        <p>
          도보 네트워크 기반 거리는 실제 보행 경로에 더 가깝지만, 실제 유모차 통행 가능 여부를 확정하지는 않습니다.
        </p>
      </div>
      <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <Info label="현재 거리 계산 방식" value={readMetadataValue(metadata?.distance_method)} />
        <Info label="도보 네트워크 상태" value={readMetadataValue(metadata?.pedestrian_network_status)} />
        <Info label="네트워크 거리 coverage" value={formatRatio(metadata?.network_distance_coverage)} />
        <Info label="직선거리 fallback coverage" value={formatRatio(metadata?.euclidean_fallback_coverage)} />
        <Info label="격자 스냅 기준" value={formatMeters(metadata?.grid_snap_max_distance_m)} />
        <Info label="시설 스냅 기준" value={formatMeters(metadata?.facility_snap_max_distance_m)} />
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-slate-800">{value}</p>
    </div>
  );
}

function formatRatio(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "정보 없음";
  return `${(value * 100).toFixed(1)}%`;
}

function formatMeters(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "정보 없음";
  return `${value.toFixed(0)}m`;
}

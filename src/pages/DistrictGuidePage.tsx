import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { DistrictSelector } from "../components/district/DistrictSelector";
import { EmptyState } from "../components/layout/EmptyState";
import { DATA_SOURCES } from "../config/dataSources";
import { useDistrictScores } from "../hooks/useDistrictScores";
import type { DistrictScore } from "../types/data";
import { isDataReady } from "../utils/dataStatus";
import { normalizeDistrictScores } from "../utils/district";
import { formatScore } from "../utils/format";

export function DistrictGuidePage() {
  const districtScores = useDistrictScores();

  const districts = useMemo<DistrictScore[]>(() => {
    if (!isDataReady(districtScores)) return [];
    return normalizeDistrictScores(districtScores.data as unknown as Array<Partial<DistrictScore> & Record<string, unknown>>);
  }, [districtScores]);

  const sortedByName = useMemo(
    () => [...districts].sort((a, b) => a.district_name.localeCompare(b.district_name, "ko")),
    [districts],
  );

  if (districtScores.status === "loading") return <LoadingState />;
  if (districtScores.status === "error") return <ErrorState message={districtScores.error ?? undefined} />;
  if (districtScores.status === "missing" || districts.length === 0) {
    return (
      <EmptyState
        title="데이터 준비 필요"
        message="구별 점수 데이터가 필요합니다. 전처리 결과 파일을 확인해 주세요."
        missingFiles={[DATA_SOURCES.districtScores.path]}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-slate-950">구 상세 선택</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          서울 25개 구 중 한 곳을 선택하면 해당 구의 250m 격자 점수, 시설 위치, 카테고리별 점수 상세를 확인할 수 있습니다.
        </p>
      </section>

      <DistrictSelector districts={districts} />

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-950">서울 25개 구 빠른 이동</h2>
        <p className="mt-1 text-sm text-slate-500">통합 유모차 생활보행 점수와 함께 표시합니다.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {sortedByName.map((district) => {
            const value = district.district_code || district.district_name;
            return (
              <Link
                key={value}
                to={`/district/${encodeURIComponent(value)}`}
                className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
              >
                <span className="font-medium">{district.district_name}</span>
                <span className="text-xs text-slate-500">{formatScore(district.overall_score)}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

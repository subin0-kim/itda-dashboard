import { useMemo, useState } from "react";
import { ErrorState } from "../components/common/ErrorState";
import { LimitationNotice } from "../components/common/LimitationNotice";
import { LoadingState } from "../components/common/LoadingState";
import { ScoreGuide } from "../components/common/ScoreGuide";
import { EmptyState } from "../components/layout/EmptyState";
import { CategoryDescriptionCard } from "../components/overview/CategoryDescriptionCard";
import { CategoryFilter } from "../components/overview/CategoryFilter";
import { DataBasisCard } from "../components/overview/DataBasisCard";
import { DistrictRankingPanel } from "../components/overview/DistrictRankingPanel";
import { KpiCards } from "../components/overview/KpiCards";
import { OverviewHero } from "../components/overview/OverviewHero";
import { SeoulDistrictMap } from "../components/map/SeoulDistrictMap";
import { DATA_SOURCES } from "../config/dataSources";
import { useDistrictScores } from "../hooks/useDistrictScores";
import { useFacilities } from "../hooks/useFacilities";
import { useGeoJsonData } from "../hooks/useGeoJsonData";
import { useMetadata } from "../hooks/useMetadata";
import type { DistrictScore } from "../types/data";
import type { OverviewCategoryId } from "../utils/category";
import { isDataReady } from "../utils/dataStatus";
import { getRankedDistricts, normalizeDistrictScore } from "../utils/scoring";

export function OverviewPage() {
  const [categoryId, setCategoryId] = useState<OverviewCategoryId>("overall");
  const districts = useGeoJsonData(DATA_SOURCES.seoulDistricts.path);
  const districtScores = useDistrictScores();
  const facilities = useFacilities();
  const metadata = useMetadata();

  const normalizedScores = useMemo<DistrictScore[] | null>(() => {
    if (!isDataReady(districtScores)) return null;
    return districtScores.data.map((item) => normalizeDistrictScore(item as unknown as Partial<DistrictScore> & Record<string, unknown>));
  }, [districtScores]);

  const ranked = useMemo(() => (normalizedScores ? getRankedDistricts(normalizedScores, categoryId) : []), [normalizedScores, categoryId]);
  const topFive = ranked.slice(0, 5);
  const bottomFive = [...ranked].reverse().slice(0, 5);

  const missingFiles = [
    districts.status === "missing" ? DATA_SOURCES.seoulDistricts.path : null,
    districtScores.status === "missing" ? DATA_SOURCES.districtScores.path : null,
  ].filter(Boolean) as string[];
  const missingMessage =
    districts.status === "missing" && districtScores.status === "missing"
      ? "전처리된 서울 구 경계 데이터와 구별 점수 데이터가 필요합니다."
      : districts.status === "missing"
        ? "서울 구 경계 데이터가 필요합니다."
        : districtScores.status === "missing"
          ? "구별 유모차 생활보행 점수 데이터가 필요합니다."
          : "전처리된 서울 구 경계 데이터와 구별 점수 데이터가 필요합니다.";

  const isLoading = districts.status === "loading" || districtScores.status === "loading";
  const hasBlockingError = districts.status === "error" || districtScores.status === "error";
  const canRenderMap = isDataReady(districts) && normalizedScores !== null;
  const noScoreDistrictCount = canRenderMap
    ? districts.data.features.filter((feature) => {
        const name = String(feature.properties?.district_name ?? feature.properties?.SIG_KOR_NM ?? feature.properties?.sgg_nm ?? "");
        const code = String(feature.properties?.district_code ?? feature.properties?.SIG_CD ?? feature.properties?.sgg_cd ?? "");
        return !normalizedScores.some((score) => (code && score.district_code === code) || (name && score.district_name === name));
      }).length
    : 0;

  return (
    <div className="space-y-6">
      <OverviewHero />
      <KpiCards scores={normalizedScores} />
      <CategoryFilter value={categoryId} onChange={setCategoryId} />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="space-y-4">
          {isLoading ? <LoadingState /> : null}
          {hasBlockingError ? (
            <ErrorState message={districts.error ?? districtScores.error ?? "데이터를 불러올 수 없음"} />
          ) : null}
          {!isLoading && !hasBlockingError && !canRenderMap ? (
            <EmptyState
              title="데이터 준비 필요"
              message={missingMessage}
              missingFiles={missingFiles.length > 0 ? missingFiles : [DATA_SOURCES.seoulDistricts.path, DATA_SOURCES.districtScores.path]}
            />
          ) : null}
          {canRenderMap ? (
            <>
              <SeoulDistrictMap
                districts={districts.data}
                scores={normalizedScores}
                categoryId={categoryId}
                facilities={isDataReady(facilities) ? facilities.data : null}
              />
              {categoryId !== "overall" && facilities.status === "missing" ? (
                <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  시설 위치 데이터가 없어 주요 시설 점을 표시할 수 없습니다.
                </div>
              ) : null}
              {noScoreDistrictCount > 0 ? (
                <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  일부 구는 점수 데이터가 없어 회색으로 표시됩니다.
                </div>
              ) : null}
            </>
          ) : null}
        </section>

        <aside className="space-y-4">
          <CategoryDescriptionCard categoryId={categoryId} />
          {normalizedScores ? (
            <>
              <DistrictRankingPanel title="접근성이 높게 나타난 구" items={topFive} categoryId={categoryId} mode="top" />
              <DistrictRankingPanel title="개선 여지가 큰 구" items={bottomFive} categoryId={categoryId} mode="bottom" />
            </>
          ) : (
            <EmptyState title="데이터 준비 필요" message="구별 유모차 생활보행 점수 데이터가 필요합니다." missingFiles={[DATA_SOURCES.districtScores.path]} />
          )}
          <DataBasisCard metadata={isDataReady(metadata) ? metadata.data : null} />
          {metadata.status === "missing" ? (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">데이터 기준 정보가 없습니다.</div>
          ) : null}
        </aside>
      </div>

      <ScoreGuide />
      <LimitationNotice />
    </div>
  );
}

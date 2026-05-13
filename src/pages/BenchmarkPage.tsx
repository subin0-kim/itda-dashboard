import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BenchmarkComparisonChart } from "../components/benchmark/BenchmarkComparisonChart";
import { BenchmarkDataBasisCard } from "../components/benchmark/BenchmarkDataBasisCard";
import { BenchmarkIntro } from "../components/benchmark/BenchmarkIntro";
import { BenchmarkMethodCard } from "../components/benchmark/BenchmarkMethodCard";
import { BenchmarkRecommendationCard } from "../components/benchmark/BenchmarkRecommendationCard";
import { DistrictSelector } from "../components/benchmark/DistrictSelector";
import { ImprovementCandidatesPanel } from "../components/benchmark/ImprovementCandidatesPanel";
import { ImprovementHintsPanel } from "../components/benchmark/ImprovementHintsPanel";
import { SelectedDistrictSummary } from "../components/benchmark/SelectedDistrictSummary";
import { ErrorState } from "../components/common/ErrorState";
import { LimitationNotice } from "../components/common/LimitationNotice";
import { LoadingState } from "../components/common/LoadingState";
import { EmptyState } from "../components/layout/EmptyState";
import { DATA_SOURCES } from "../config/dataSources";
import { useBenchmarkRecommendations } from "../hooks/useBenchmarkRecommendations";
import { useDistrictScores } from "../hooks/useDistrictScores";
import { useJsonData } from "../hooks/useJsonData";
import { useMetadata } from "../hooks/useMetadata";
import type { BenchmarkSortKey } from "../utils/benchmark";
import { findBenchmarkDistrict, findDistrictById, findRecommendationForDistrict } from "../utils/benchmark";
import { isDataReady } from "../utils/dataStatus";
import type { CategorySummary, DataLoadState } from "../types/data";

export function BenchmarkPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const districtScores = useDistrictScores();
  const recommendations = useBenchmarkRecommendations();
  const categorySummary = useJsonData<CategorySummary>(DATA_SOURCES.categorySummary.path);
  const metadata = useMetadata();
  const [sortKey, setSortKey] = useState<BenchmarkSortKey>("rank");
  const [selectedDistrictId, setSelectedDistrictId] = useState("");

  const districts = isDataReady(districtScores) ? districtScores.data : [];
  const recommendationItems = isDataReady(recommendations) ? recommendations.data : [];
  const selectedDistrict = useMemo(() => findDistrictById(districts, selectedDistrictId), [districts, selectedDistrictId]);
  const recommendation = useMemo(
    () => findRecommendationForDistrict(recommendationItems, selectedDistrict),
    [recommendationItems, selectedDistrict],
  );
  const benchmarkDistrict = useMemo(() => findBenchmarkDistrict(districts, recommendation), [districts, recommendation]);
  const missingFiles = getMissingFiles([districtScores, recommendations, categorySummary, metadata]);
  const loading = [districtScores, recommendations, categorySummary, metadata].some((state) => state.status === "loading");
  const errors = [districtScores, recommendations, categorySummary, metadata].filter((state) => state.status === "error");

  useEffect(() => {
    if (!isDataReady(districtScores)) return;
    const queryDistrict = searchParams.get("district");
    const matched = findDistrictById(districtScores.data, queryDistrict);
    if (matched) {
      setSelectedDistrictId(matched.district_code || matched.district_name);
    } else if (!queryDistrict) {
      setSelectedDistrictId((current) => current);
    } else {
      setSelectedDistrictId("");
    }
  }, [districtScores, searchParams]);

  const handleDistrictChange = (districtId: string) => {
    setSelectedDistrictId(districtId);
    if (districtId) setSearchParams({ district: districtId });
    else setSearchParams({});
  };

  return (
    <div className="space-y-6">
      <BenchmarkIntro />

      {loading ? <LoadingState message="벤치마킹 데이터를 불러오는 중입니다." /> : null}
      {errors.length > 0 ? <ErrorState message={errors.map((state) => state.error).join("\n")} /> : null}
      {missingFiles.length > 0 ? <EmptyState title="데이터 준비 필요" message={getMissingMessage(missingFiles)} missingFiles={missingFiles} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <DistrictSelector
            districts={districts}
            selectedDistrictId={selectedDistrictId}
            sortKey={sortKey}
            onSortChange={setSortKey}
            onDistrictChange={handleDistrictChange}
          />
          {!selectedDistrictId ? <EmptyState title="데이터 준비 필요" message="분석할 구를 선택해 주세요." /> : null}
          {selectedDistrictId && !selectedDistrict && isDataReady(districtScores) ? (
            <EmptyState title="데이터 준비 필요" message="선택한 구의 점수 데이터가 없습니다." />
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <SelectedDistrictSummary district={selectedDistrict} />
            <BenchmarkRecommendationCard selectedDistrict={selectedDistrict} benchmarkDistrict={benchmarkDistrict} recommendation={recommendation} />
          </div>

          <BenchmarkComparisonChart selectedDistrict={selectedDistrict} benchmarkDistrict={benchmarkDistrict} allDistricts={districts} />
          <ImprovementHintsPanel selectedDistrict={selectedDistrict} benchmarkDistrict={benchmarkDistrict} recommendation={recommendation} />
        </div>

        <aside className="space-y-6">
          <ImprovementCandidatesPanel districts={districts} />
          <BenchmarkMethodCard />
          <BenchmarkDataBasisCard metadata={isDataReady(metadata) ? metadata.data : null} />
        </aside>
      </div>
      <LimitationNotice />
    </div>
  );
}

function getMissingFiles(states: Array<DataLoadState<unknown>>) {
  return states.filter((state) => state.status === "missing").map((state) => state.path);
}

function getMissingMessage(files: string[]) {
  if (files.includes(DATA_SOURCES.districtScores.path)) return "구별 점수 데이터가 필요합니다.";
  if (files.includes(DATA_SOURCES.benchmarkRecommendations.path)) return "벤치마킹 추천 데이터가 필요합니다.";
  return "전처리된 벤치마킹 데이터가 필요합니다.";
}

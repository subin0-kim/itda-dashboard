import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CategoryDataBasisCard } from "../components/category/CategoryDataBasisCard";
import { CategoryFormulaCard } from "../components/category/CategoryFormulaCard";
import { CategoryHeader } from "../components/category/CategoryHeader";
import { CategoryInsightPanel } from "../components/category/CategoryInsightPanel";
import { CategoryMap, type CategoryMapViewMode } from "../components/category/CategoryMap";
import { CategoryRankingPanel } from "../components/category/CategoryRankingPanel";
import { CategoryTabs } from "../components/category/CategoryTabs";
import { FacilityTypeFilter } from "../components/category/FacilityTypeFilter";
import { ErrorState } from "../components/common/ErrorState";
import { LimitationNotice } from "../components/common/LimitationNotice";
import { LoadingState } from "../components/common/LoadingState";
import { ScoreGuide } from "../components/common/ScoreGuide";
import { EmptyState } from "../components/layout/EmptyState";
import { DATA_SOURCES } from "../config/dataSources";
import { getCategoryDefinition } from "../config/categories";
import { useDistrictScores } from "../hooks/useDistrictScores";
import { useFacilities } from "../hooks/useFacilities";
import { useGeoJsonData } from "../hooks/useGeoJsonData";
import { useGridScores } from "../hooks/useGridScores";
import { useJsonData } from "../hooks/useJsonData";
import { useMetadata } from "../hooks/useMetadata";
import type { CategoryId, CategorySummary, DataLoadState, FacilityType } from "../types/data";
import type { GeoJsonFeatureCollection } from "../types/geojson";
import { FACILITY_TYPE_OPTIONS, getOverviewCategory } from "../utils/category";
import { isDataReady } from "../utils/dataStatus";
import { normalizeCategory, readString } from "../utils/district";
import { isFamilyMedicineUsed } from "../utils/metadata";
import { getTopAndBottomDistricts } from "../utils/ranking";
import { calculateScoreStatistics } from "../utils/statistics";

const EMPTY_COLLECTION: GeoJsonFeatureCollection = { type: "FeatureCollection", features: [] };

export function CategoryDetailPage() {
  const { categoryId } = useParams();
  const category = getCategoryDefinition(categoryId);
  const districtBoundaries = useGeoJsonData(DATA_SOURCES.seoulDistricts.path);
  const gridScores = useGridScores();
  const districtScores = useDistrictScores();
  const facilities = useFacilities();
  const categorySummary = useJsonData<CategorySummary>(DATA_SOURCES.categorySummary.path);
  const metadata = useMetadata();
  const [viewMode, setViewMode] = useState<CategoryMapViewMode>("district");
  const [selectedFacilityTypes, setSelectedFacilityTypes] = useState<string[]>([]);

  const categoryOptions = category ? FACILITY_TYPE_OPTIONS[category.id as CategoryId] : [];
  const facilityCounts = useMemo<Record<string, number> & { total: number }>(() => {
    if (!category || !isDataReady(facilities)) return { total: 0 };
    return getCategoryFacilityCounts(facilities.data, category.id as CategoryId);
  }, [category, facilities]);

  useEffect(() => {
    if (!category) return;
    const availableTypes = FACILITY_TYPE_OPTIONS[category.id as CategoryId].filter((option) => (facilityCounts[option.id] ?? 0) > 0).map((option) => option.id);
    setSelectedFacilityTypes(availableTypes);
  }, [category, facilityCounts]);

  if (!category) {
    return <EmptyState title="데이터 준비 필요" message="선택한 카테고리를 찾을 수 없습니다." />;
  }

  const categoryIdValue = category.id as CategoryId;
  const scoreKey = getOverviewCategory(categoryIdValue).scoreKey;
  const scores = isDataReady(districtScores) ? districtScores.data : [];
  const statistics = scores.length > 0 ? calculateScoreStatistics(scores, scoreKey) : null;
  const ranking = getTopAndBottomDistricts(scores, scoreKey, 5);
  const topDistrictName = ranking.top[0]?.district_name ?? null;
  const bottomDistrictName = ranking.bottom[0]?.district_name ?? null;
  const facilityFilterOptions = categoryOptions.map((option) => ({
    id: option.id as FacilityType,
    label: option.label,
    count: facilityCounts[option.id] ?? 0,
  }));
  const missingFiles = getMissingFiles([districtBoundaries, gridScores, districtScores, facilities, categorySummary, metadata]);
  const loading = [districtBoundaries, gridScores, districtScores, facilities, categorySummary, metadata].some((state) => state.status === "loading");
  const errors = [districtBoundaries, gridScores, districtScores, facilities, categorySummary, metadata].filter((state) => state.status === "error");
  const hasCategoryScore = scores.length > 0 && scores.some((score) => typeof score[scoreKey] === "number");
  const hasCategoryFacilities = isDataReady(facilities) && getCategoryFacilityCounts(facilities.data, categoryIdValue).total > 0;

  return (
    <div className="space-y-6">
      <CategoryHeader
        category={category}
        statistics={statistics}
        topDistrictName={topDistrictName}
        bottomDistrictName={bottomDistrictName}
        facilityLabels={categoryOptions.map((option) => option.label)}
      />

      {categoryIdValue === "medical" && isDataReady(metadata) && !isFamilyMedicineUsed(metadata.data) ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          현재 데이터에서는 가정의학과가 별도 반영되지 않아 소아청소년과와 종합병원 기준으로 의료 접근성을 계산했습니다.
        </div>
      ) : null}

      <CategoryTabs current={categoryIdValue} />

      {loading ? <LoadingState message="카테고리 데이터를 불러오는 중입니다." /> : null}
      {errors.length > 0 ? <ErrorState message={errors.map((state) => state.error).join("\n")} /> : null}
      {missingFiles.length > 0 ? (
        <EmptyState title="데이터 준비 필요" message={getMissingMessage(missingFiles)} missingFiles={missingFiles} />
      ) : null}
      {!hasCategoryScore && isDataReady(districtScores) ? (
        <EmptyState title="데이터 준비 필요" message="선택 카테고리 점수 데이터가 없습니다." />
      ) : null}

      <FacilityTypeFilter options={facilityFilterOptions} selectedTypes={selectedFacilityTypes} onChange={setSelectedFacilityTypes} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {isDataReady(districtBoundaries) ? (
            <CategoryMap
              categoryId={categoryIdValue}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              districts={districtBoundaries.data}
              districtScores={scores}
              grids={isDataReady(gridScores) ? gridScores.data : EMPTY_COLLECTION}
              facilities={isDataReady(facilities) ? facilities.data : EMPTY_COLLECTION}
              selectedFacilityTypes={selectedFacilityTypes}
            />
          ) : (
            <EmptyState title="데이터 준비 필요" message="서울 구 경계 데이터가 필요합니다." />
          )}
          {!hasCategoryFacilities && isDataReady(facilities) ? (
            <EmptyState title="데이터 준비 필요" message="선택 카테고리 시설 데이터가 없습니다." />
          ) : null}
        </div>

        <aside className="space-y-6">
          <CategoryRankingPanel title="접근성이 높게 나타난 구" items={ranking.top} scoreKey={scoreKey} />
          <CategoryRankingPanel title="개선 여지가 큰 구" items={ranking.bottom} scoreKey={scoreKey} />
          <CategoryInsightPanel statistics={statistics} />
        </aside>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryFormulaCard categoryId={categoryIdValue} />
        <CategoryDataBasisCard metadata={isDataReady(metadata) ? metadata.data : null} />
      </div>
      <ScoreGuide />
      <LimitationNotice />
    </div>
  );
}

function getCategoryFacilityCounts(facilities: GeoJsonFeatureCollection, categoryId: CategoryId): Record<string, number> & { total: number } {
  const counts: Record<string, number> & { total: number } = { total: 0 };
  for (const feature of facilities.features) {
    const category = normalizeCategory(feature.properties?.category);
    if (category !== categoryId) continue;
    const type = readString(feature.properties?.facility_type);
    if (!type) continue;
    counts[type] = (counts[type] ?? 0) + 1;
    counts.total += 1;
  }
  return counts;
}

function getMissingFiles(states: Array<DataLoadState<unknown>>) {
  return states.filter((state) => state.status === "missing").map((state) => state.path);
}

function getMissingMessage(files: string[]) {
  if (files.includes(DATA_SOURCES.districtScores.path)) return "구별 점수 데이터가 필요합니다.";
  if (files.includes(DATA_SOURCES.seoulDistricts.path)) return "서울 구 경계 데이터가 필요합니다.";
  if (files.includes(DATA_SOURCES.gridScores.path)) return "250m 격자 점수 데이터가 필요합니다.";
  if (files.includes(DATA_SOURCES.facilities.path)) return "시설 위치 데이터가 필요합니다.";
  return "전처리된 카테고리 데이터가 필요합니다.";
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import { CategoryFilter } from "../components/overview/CategoryFilter";
import { ErrorState } from "../components/common/ErrorState";
import { LimitationNotice } from "../components/common/LimitationNotice";
import { LoadingState } from "../components/common/LoadingState";
import { EmptyState } from "../components/layout/EmptyState";
import { BenchmarkCtaCard } from "../components/district/BenchmarkCtaCard";
import { CategoryScoreCards } from "../components/district/CategoryScoreCards";
import { DistrictDataBasisCard } from "../components/district/DistrictDataBasisCard";
import { DistrictFacilityFilters } from "../components/district/DistrictFacilityFilters";
import { DistrictGridMap } from "../components/district/DistrictGridMap";
import { DistrictInsightPanel } from "../components/district/DistrictInsightPanel";
import { DistrictSelector } from "../components/district/DistrictSelector";
import { DistrictSummaryHeader } from "../components/district/DistrictSummaryHeader";
import { GridSummaryPanel } from "../components/district/GridSummaryPanel";
import { DATA_SOURCES } from "../config/dataSources";
import { ROUTES } from "../config/routes";
import { useBenchmarkRecommendations } from "../hooks/useBenchmarkRecommendations";
import { useDistrictScores } from "../hooks/useDistrictScores";
import { useFacilities } from "../hooks/useFacilities";
import { useGeoJsonData } from "../hooks/useGeoJsonData";
import { useGridScores } from "../hooks/useGridScores";
import { useMetadata } from "../hooks/useMetadata";
import type { BenchmarkRecommendation, DistrictScore } from "../types/data";
import type { GeoJsonFeatureCollection } from "../types/geojson";
import type { OverviewCategoryId } from "../utils/category";
import { FACILITY_TYPE_OPTIONS } from "../utils/category";
import { isDataReady } from "../utils/dataStatus";
import {
  filterDistrictBoundary,
  filterDistrictFacilities,
  filterDistrictFeatures,
  findBenchmarkForDistrict,
  findDistrictByRoute,
  getFacilityTypeCounts,
  normalizeDistrictScores,
} from "../utils/district";
import { getCategoryAverages, getGridSummary } from "../utils/scoreSummary";

const EMPTY_COLLECTION: GeoJsonFeatureCollection = { type: "FeatureCollection", features: [] };

export function DistrictDetailPage() {
  const { districtId } = useParams();
  const [categoryId, setCategoryId] = useState<OverviewCategoryId>("overall");
  const [selectedFacilityTypes, setSelectedFacilityTypes] = useState<string[]>([]);

  const seoulDistricts = useGeoJsonData(DATA_SOURCES.seoulDistricts.path);
  const gridScores = useGridScores();
  const districtScores = useDistrictScores();
  const facilities = useFacilities();
  const recommendations = useBenchmarkRecommendations();
  const metadata = useMetadata();

  const normalizedScores = useMemo<DistrictScore[] | null>(() => {
    if (!isDataReady(districtScores)) return null;
    return normalizeDistrictScores(districtScores.data as unknown as Array<Partial<DistrictScore> & Record<string, unknown>>);
  }, [districtScores]);

  const district = useMemo(() => findDistrictByRoute(normalizedScores ?? [], districtId), [districtId, normalizedScores]);
  const districtBoundary = useMemo(
    () => (district && isDataReady(seoulDistricts) ? filterDistrictBoundary(seoulDistricts.data, district) : EMPTY_COLLECTION),
    [district, seoulDistricts],
  );
  const districtGrids = useMemo(
    () => (district && isDataReady(gridScores) ? filterDistrictFeatures(gridScores.data, district) : EMPTY_COLLECTION),
    [district, gridScores],
  );
  const districtFacilities = useMemo(
    () =>
      district && isDataReady(facilities) && isDataReady(seoulDistricts)
        ? filterDistrictFacilities(facilities.data, districtBoundary, district)
        : EMPTY_COLLECTION,
    [district, facilities, seoulDistricts, districtBoundary],
  );
  const facilityCounts = useMemo(() => getFacilityTypeCounts(districtFacilities), [districtFacilities]);
  const categoryAverages = useMemo(() => getCategoryAverages(normalizedScores ?? []), [normalizedScores]);
  const gridSummary = useMemo(() => getGridSummary(districtGrids, categoryId), [districtGrids, categoryId]);
  const benchmark = useMemo(
    () => (district && isDataReady(recommendations) ? findBenchmarkForDistrict(recommendations.data as BenchmarkRecommendation[], district) : null),
    [district, recommendations],
  );

  useEffect(() => {
    if (categoryId === "overall") {
      setSelectedFacilityTypes([]);
      return;
    }
    const available = FACILITY_TYPE_OPTIONS[categoryId].map((option) => option.id).filter((type) => (facilityCounts[type] ?? 0) > 0);
    setSelectedFacilityTypes(available);
  }, [categoryId, facilityCounts]);

  const loading =
    seoulDistricts.status === "loading" ||
    gridScores.status === "loading" ||
    districtScores.status === "loading" ||
    facilities.status === "loading";

  const blockingError = seoulDistricts.status === "error" || districtScores.status === "error";
  const blockingMissing = districtScores.status === "missing" || seoulDistricts.status === "missing";
  const blockingMissingFiles = [
    districtScores.status === "missing" ? { path: DATA_SOURCES.districtScores.path, message: "구별 점수 데이터가 필요합니다." } : null,
    seoulDistricts.status === "missing" ? { path: DATA_SOURCES.seoulDistricts.path, message: "서울 구 경계 데이터가 필요합니다." } : null,
  ].filter(Boolean) as Array<{ path: string; message: string }>;

  if (loading) return <LoadingState />;
  if (blockingError) return <ErrorState message={seoulDistricts.error ?? districtScores.error ?? undefined} />;
  if (blockingMissing) {
    return (
      <EmptyState
        title="데이터 준비 필요"
        message={blockingMissingFiles.map((file) => file.message).join(" ")}
        missingFiles={blockingMissingFiles.map((file) => file.path)}
      />
    );
  }
  if (!district) {
    return <EmptyState title="데이터 준비 필요" message="선택한 구의 상세 데이터를 찾을 수 없습니다." />;
  }

  const facilityCollection = facilities.status === "missing" ? EMPTY_COLLECTION : districtFacilities;
  const gridCollection = gridScores.status === "missing" ? EMPTY_COLLECTION : districtGrids;

  return (
    <div className="space-y-6">
      {normalizedScores && normalizedScores.length > 0 ? (
        <DistrictSelector districts={normalizedScores} selected={district} />
      ) : null}
      <DistrictSummaryHeader district={district} />
      <CategoryScoreCards district={district} averages={categoryAverages} selectedCategory={categoryId} onSelect={setCategoryId} />
      <CategoryFilter value={categoryId} onChange={setCategoryId} />

      {gridScores.status === "missing" ? (
        <EmptyState title="데이터 준비 필요" message="250m 격자 점수 데이터가 필요합니다." missingFiles={[DATA_SOURCES.gridScores.path]} />
      ) : null}
      {facilities.status === "missing" ? (
        <EmptyState title="데이터 준비 필요" message="시설 위치 데이터가 필요합니다." missingFiles={[DATA_SOURCES.facilities.path]} />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <DistrictGridMap
          key={`${district.district_code || district.district_name}-${categoryId}`}
          boundary={districtBoundary}
          grids={gridCollection}
          facilities={facilityCollection}
          categoryId={categoryId}
          selectedFacilityTypes={selectedFacilityTypes}
        />
        <aside className="space-y-4">
          <DistrictFacilityFilters
            categoryId={categoryId}
            selectedTypes={selectedFacilityTypes}
            counts={facilityCounts}
            onChange={setSelectedFacilityTypes}
          />
          <GridSummaryPanel summary={gridSummary} />
          <DistrictInsightPanel district={district} averages={categoryAverages} />
          <BenchmarkCtaCard district={district} recommendation={benchmark} />
          <Link
            to={ROUTES.methodology}
            className="block rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            방법론 보기
          </Link>
          <DistrictDataBasisCard metadata={isDataReady(metadata) ? metadata.data : null} />
        </aside>
      </div>
      <LimitationNotice />
    </div>
  );
}

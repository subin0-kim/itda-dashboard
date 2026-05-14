import { ActualDataSourceTable } from "../components/methodology/ActualDataSourceTable";
import { CategoryFormulaSection } from "../components/methodology/CategoryFormulaSection";
import { ContestCriteriaMapping } from "../components/methodology/ContestCriteriaMapping";
import { CoordinateSystemSection } from "../components/methodology/CoordinateSystemSection";
import { DistanceLimitTable } from "../components/methodology/DistanceLimitTable";
import { FormulaSection } from "../components/methodology/FormulaSection";
import { LimitationsSection } from "../components/methodology/LimitationsSection";
import { LivingWeightSection } from "../components/methodology/LivingWeightSection";
import { MethodologyIntro } from "../components/methodology/MethodologyIntro";
import { OptionalDataStatusTable } from "../components/methodology/OptionalDataStatusTable";
import { PedestrianNetworkSection } from "../components/methodology/PedestrianNetworkSection";
import { PreprocessingPipelineSection } from "../components/methodology/PreprocessingPipelineSection";
import { ProcessSteps } from "../components/methodology/ProcessSteps";
import { SeoulDataHubUsageGuide } from "../components/methodology/SeoulDataHubUsageGuide";
import { ErrorState } from "../components/common/ErrorState";
import { LoadingState } from "../components/common/LoadingState";
import { EmptyState } from "../components/layout/EmptyState";
import { DATA_SOURCES } from "../config/dataSources";
import { useDistrictScores } from "../hooks/useDistrictScores";
import { useJsonData } from "../hooks/useJsonData";
import { useMetadata } from "../hooks/useMetadata";
import type { CategorySummary, DataLoadState } from "../types/data";
import { isDataReady } from "../utils/dataStatus";

export function MethodologyPage() {
  const metadata = useMetadata();
  const categorySummary = useJsonData<CategorySummary>(DATA_SOURCES.categorySummary.path);
  const districtScores = useDistrictScores();
  const missingFiles = getMissingFiles([metadata, categorySummary, districtScores]);
  const loading = [metadata, categorySummary, districtScores].some((state) => state.status === "loading");
  const errors = [metadata, categorySummary, districtScores].filter((state) => state.status === "error");
  const metadataValue = isDataReady(metadata) ? metadata.data : null;

  return (
    <div className="space-y-6">
      <MethodologyIntro />

      {loading ? <LoadingState message="방법론 관련 데이터를 확인하는 중입니다." /> : null}
      {errors.length > 0 ? <ErrorState message={errors.map((state) => state.error).join("\n")} /> : null}
      {missingFiles.includes(DATA_SOURCES.metadata.path) ? (
        <EmptyState
          title="데이터 준비 필요"
          message="metadata.json이 없어 실제 데이터 출처와 전처리 기준 정보를 표시할 수 없습니다."
          missingFiles={[DATA_SOURCES.metadata.path]}
        />
      ) : null}

      <ProcessSteps />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <FormulaSection />
          <CategoryFormulaSection metadata={metadataValue} />
          <DistanceLimitTable />
        </div>
        <div className="space-y-6">
          <CoordinateSystemSection metadata={metadataValue} />
          <PreprocessingPipelineSection metadata={metadataValue} />
        </div>
      </div>

      <PedestrianNetworkSection metadata={metadataValue} />
      <LivingWeightSection metadata={metadataValue} />

      <ActualDataSourceTable metadata={metadataValue} />
      <OptionalDataStatusTable metadata={metadataValue} />

      <div className="grid gap-6 lg:grid-cols-2">
        <SeoulDataHubUsageGuide />
        <ContestCriteriaMapping />
      </div>
      <LimitationsSection />
    </div>
  );
}

function getMissingFiles(states: Array<DataLoadState<unknown>>) {
  return states.filter((state) => state.status === "missing").map((state) => state.path);
}

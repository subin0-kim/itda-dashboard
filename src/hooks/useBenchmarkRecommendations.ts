import { DATA_SOURCES } from "../config/dataSources";
import type { BenchmarkRecommendation } from "../types/data";
import { useJsonData } from "./useJsonData";

export function useBenchmarkRecommendations() {
  return useJsonData<BenchmarkRecommendation[]>(DATA_SOURCES.benchmarkRecommendations.path);
}

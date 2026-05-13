import { DATA_SOURCES } from "../config/dataSources";
import type { DistrictScore } from "../types/data";
import { useJsonData } from "./useJsonData";

export function useDistrictScores() {
  return useJsonData<DistrictScore[]>(DATA_SOURCES.districtScores.path);
}

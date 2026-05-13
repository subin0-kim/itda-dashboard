import { DATA_SOURCES } from "../config/dataSources";
import { useGeoJsonData } from "./useGeoJsonData";

export function useGridScores() {
  return useGeoJsonData(DATA_SOURCES.gridScores.path);
}

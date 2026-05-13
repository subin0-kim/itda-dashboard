import { DATA_SOURCES } from "../config/dataSources";
import { useGeoJsonData } from "./useGeoJsonData";

export function useFacilities() {
  return useGeoJsonData(DATA_SOURCES.facilities.path);
}

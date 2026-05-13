import { DATA_SOURCES } from "../config/dataSources";
import type { Metadata } from "../types/data";
import { useJsonData } from "./useJsonData";

export function useMetadata() {
  return useJsonData<Metadata>(DATA_SOURCES.metadata.path);
}

export type CategoryId = "medical" | "administration" | "education" | "leisure";

export type FacilityType =
  | "pediatric_clinic"
  | "family_medicine"
  | "general_hospital"
  | "community_center"
  | "district_office"
  | "city_hall"
  | "childcare_center"
  | "kindergarten"
  | "park"
  | "library_culture"
  | "large_retail_optional";

export interface DistrictScore {
  district_code: string;
  district_name: string;
  overall_score: number | null;
  rank: number | null;
  medical_score: number | null;
  admin_score: number | null;
  education_score: number | null;
  leisure_score: number | null;
  family_medicine_score?: number | null;
  weakest_category?: CategoryId | null;
  strongest_category?: CategoryId | null;
}

export type CategorySummaryItem = {
  district_code: string;
  district_name: string;
  score: number | null;
  rank: number | null;
};

export type CategorySummary = Partial<Record<CategoryId, CategorySummaryItem[]>>;

export interface Metadata {
  source_datasets?: Record<string, string> | MetadataSourceDataset[];
  unavailable_optional_datasets?: string[] | MetadataUnavailableDataset[];
  generated_at?: string | null;
  coordinate_systems?: Record<string, string>;
  scoring_formula_version?: string | null;
  limitations?: string[];
  applied_leisure_formula?: string | null;
  applied_medical_formula?: string | null;
  family_medicine_used?: boolean | null;
  scoring_method?: string | null;
  distance_score_method?: string | null;
  full_score_distance_m?: number | null;
  zero_score_distance_m?: number | null;
  type_max_scores?: Record<string, number>;
  category_formulas?: Record<string, unknown>;
  distance_method?: string | null;
  pedestrian_network_status?: string | null;
  pedestrian_network_limitations?: string[] | null;
  network_distance_coverage?: number | null;
  euclidean_fallback_coverage?: number | null;
  distance_method_summary?: Record<string, number>;
  score_distance_method_summary?: Record<string, number>;
  district_network_status?: Record<string, unknown>;
  grid_snap_max_distance_m?: number | null;
  facility_snap_max_distance_m?: number | null;
  aggregation_method?: string | null;
  living_weight_status?: string | null;
  living_weight_method?: string | null;
  living_weight_source_datasets?: MetadataSourceDataset[] | null;
  living_weight_limitations?: string[] | null;
  origin_destination_role_note?: string | null;
  unknown_living_weight_ratio?: number | null;
  zero_living_weight_grid_count?: number | null;
  preprocessing_scripts?: string[];
  raw_inventory_summary?: Record<string, unknown>;
  excluded_records_summary?: Record<string, unknown>;
  facility_counts?: Record<string, number>;
  score_null_summary?: Record<string, number>;
  distance_null_summary?: Record<string, number>;
  district_count?: number | null;
}

export interface MetadataSourceDataset {
  name?: string | null;
  provider?: string | null;
  raw_file?: string | null;
  source_url?: string | null;
  category?: string | null;
  facility_type?: string | null;
  used?: boolean | null;
  기준시점?: string | null;
  reference_date?: string | null;
  collected_at?: string | null;
}

export interface MetadataUnavailableDataset {
  name?: string | null;
  reason?: string | null;
  affected_score?: string | null;
  fallback_formula?: string | null;
}

export type DataLoadStatus = "idle" | "loading" | "success" | "missing" | "error";

export interface DataLoadState<T> {
  status: DataLoadStatus;
  data: T | null;
  error: string | null;
  path: string;
}

export interface DataSourceConfig {
  key: string;
  path: string;
  label: string;
  type: "json" | "geojson";
}

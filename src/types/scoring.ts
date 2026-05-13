import type { CategoryId } from "./data";

export interface CategoryDefinition {
  id: CategoryId;
  label: string;
  shortLabel: string;
  description: string;
  colorClass: string;
  scoreKey: "medical_score" | "admin_score" | "education_score" | "leisure_score";
}

export interface ScoreBand {
  label: string;
  colorClass: string;
}

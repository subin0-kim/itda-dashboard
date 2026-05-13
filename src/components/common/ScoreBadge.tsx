import { formatScore } from "../../utils/format";

interface ScoreBadgeProps {
  score: number | null | undefined;
  tone?: "overall" | "medical" | "administration" | "education" | "leisure" | "muted";
}

const toneClass = {
  overall: "border-indigo-200 bg-indigo-50 text-indigo-700",
  medical: "border-rose-200 bg-rose-50 text-rose-700",
  administration: "border-blue-200 bg-blue-50 text-blue-700",
  education: "border-amber-200 bg-amber-50 text-amber-700",
  leisure: "border-emerald-200 bg-emerald-50 text-emerald-700",
  muted: "border-slate-200 bg-slate-50 text-slate-500",
};

export function ScoreBadge({ score, tone = "overall" }: ScoreBadgeProps) {
  return (
    <span className={`inline-flex rounded-md border px-2.5 py-1 text-sm font-semibold ${toneClass[tone]}`}>
      {formatScore(score)}
    </span>
  );
}

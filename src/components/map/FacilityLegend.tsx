import type { CategoryId } from "../../types/data";

export const FACILITY_CATEGORY_COLORS: Record<CategoryId, string> = {
  medical: "#e11d48",
  administration: "#2563eb",
  education: "#d97706",
  leisure: "#059669",
};

const ITEMS: Array<{ id: CategoryId; label: string }> = [
  { id: "medical", label: "의료" },
  { id: "administration", label: "행정" },
  { id: "education", label: "교육" },
  { id: "leisure", label: "여가" },
];

interface FacilityLegendProps {
  categories?: CategoryId[];
  className?: string;
}

export function FacilityLegend({ categories, className }: FacilityLegendProps) {
  const visible = categories ? ITEMS.filter((item) => categories.includes(item.id)) : ITEMS;
  if (visible.length === 0) return null;
  return (
    <div className={["rounded-lg border border-slate-200 bg-white p-3 shadow-sm", className ?? ""].join(" ")}>
      <div className="text-xs font-semibold text-slate-900">시설 범례</div>
      <p className="mt-1 text-[11px] leading-4 text-slate-500">점은 주요 생활시설의 실제 위치입니다.</p>
      <ul className="mt-2 grid grid-cols-2 gap-y-1 text-[11px] text-slate-600">
        {visible.map((item) => (
          <li key={item.id} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-white"
              style={{ backgroundColor: FACILITY_CATEGORY_COLORS[item.id] }}
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

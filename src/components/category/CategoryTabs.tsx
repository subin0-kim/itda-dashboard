import { Link } from "react-router-dom";
import { CATEGORY_DEFINITIONS } from "../../config/categories";
import type { CategoryId } from "../../types/data";

interface CategoryTabsProps {
  current: CategoryId;
}

export function CategoryTabs({ current }: CategoryTabsProps) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="카테고리 탭">
      {CATEGORY_DEFINITIONS.map((category) => (
        <Link
          key={category.id}
          to={`/category/${category.id}`}
          className={[
            "rounded-md border px-3 py-2 text-sm font-medium transition",
            category.id === current ? category.colorClass : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
          ].join(" ")}
        >
          {category.label}
        </Link>
      ))}
    </nav>
  );
}

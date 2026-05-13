import { NavLink, useLocation } from "react-router-dom";
import { BarChart3, Building2, Layers3, MapPinned } from "lucide-react";
import { ROUTES } from "../../config/routes";

const navItems = [
  { to: ROUTES.overview, label: "전체 현황", icon: MapPinned },
  { to: ROUTES.districtGuide, label: "구 상세", icon: Building2 },
  { to: ROUTES.categoryDefault, label: "카테고리", icon: Layers3 },
  { to: ROUTES.methodology, label: "방법론", icon: BarChart3 },
];

export function AppHeader() {
  const location = useLocation();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <NavLink to={ROUTES.overview} className="min-w-56">
          <div className="text-lg font-semibold text-slate-950">잇다(:connect)</div>
          <div className="mt-0.5 text-xs text-slate-500">아이와 도시를 잇다. 서울의 미래를 잇다.</div>
        </NavLink>
        <nav className="flex flex-wrap items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
                    isActive ||
                    (item.to === ROUTES.districtGuide && location.pathname.startsWith("/district/")) ||
                    (item.to === ROUTES.categoryDefault && location.pathname.startsWith("/category/"))
                      ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                  ].join(" ")
                }
              >
                <Icon size={16} aria-hidden="true" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

import { Link } from "react-router-dom";
import { ROUTES } from "../../config/routes";
import { LimitationNotice } from "../common/LimitationNotice";

export function OverviewHero() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">서울시 아이동반 친화점수</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            서울 25개 구의 아이동반 생활시설 접근성을 250m 격자 기반 유모차 생활보행 점수로 비교합니다.
          </p>
          <Link to={ROUTES.methodology} className="mt-4 inline-flex rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            점수 산식 보기
          </Link>
        </div>
        <LimitationNotice compact />
      </div>
    </section>
  );
}

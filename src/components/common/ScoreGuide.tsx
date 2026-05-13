import { Link } from "react-router-dom";
import { ROUTES } from "../../config/routes";

const rows = [
  ["80~100", "접근성이 매우 높게 나타남"],
  ["60~80", "접근성이 높게 나타남"],
  ["40~60", "보통 수준"],
  ["20~40", "개선 여지가 있음"],
  ["0~20", "개선 여지가 크게 나타남"],
  ["데이터 없음", "계산 불가"],
];

export function ScoreGuide() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-950">점수 해석</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            점수가 높을수록 해당 구 또는 격자에서 주요 생활시설까지의 공개데이터 기반 접근성이 높게 나타났다는 의미입니다.
            구별 점수는 250m 격자 점수를 바탕으로 계산되며, 가능한 경우 공원·녹지·하천·산지 등 비생활 출발지의 영향을 줄이기 위해 생활 출발지 가중 평균을 적용합니다.
            실제 유모차 통행 가능 여부를 확정하는 지표는 아닙니다.
          </p>
        </div>
        <Link to={ROUTES.methodology} className="shrink-0 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          점수 산식 보기
        </Link>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([range, label]) => (
          <div key={range} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-xs">
            <span className="font-medium text-slate-700">{range}</span>
            <span className="text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

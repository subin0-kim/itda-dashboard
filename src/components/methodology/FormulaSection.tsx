import { FACILITY_SCORE_DESCRIPTION, FACILITY_SCORE_FORMULA } from "../../utils/methodology";

export function FormulaSection() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">점수 산식</h2>
      <div className="mt-4 space-y-4">
        <FormulaBlock title="시설 접근 점수" formula={FACILITY_SCORE_FORMULA} />
        <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
          <p>g: 250m 격자</p>
          <p>t: 시설 유형</p>
          <p>W: 시설 유형별 최대 점수</p>
          <p>D: 전처리에서 계산된 접근 거리</p>
        </div>
        <p className="text-sm leading-6 text-slate-600">{FACILITY_SCORE_DESCRIPTION}</p>
        <FormulaBlock
          title="카테고리 점수 (가산식, 최대 100)"
          formula="CategoryScore = min(100, Σ DistanceAdjustedScore(typeMaxScore[t], D[t]))"
        />
        <p className="text-sm leading-6 text-slate-600">
          시설 유형별 최대 점수 기여분을 더하여 산출하되 100을 초과하면 100으로 cap합니다. 누락된 시설 유형은 0으로
          기여하며 metadata에 기록됩니다.
        </p>
        <FormulaBlock
          title="격자 통합 점수"
          formula="GridStrollerScore = 0.30 × MedicalScore + 0.30 × EducationScore + 0.20 × AdminScore + 0.20 × LeisureScore"
        />
        <FormulaBlock
          title="구별 점수"
          formula="DistrictStrollerScore = Σ GridStrollerScore × LivingWeight / Σ LivingWeight (LivingWeight 미확보 시 단순 평균)"
        />
      </div>
    </section>
  );
}

function FormulaBlock({ title, formula }: { title: string; formula: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <code className="mt-2 block rounded-md bg-slate-900 px-4 py-3 text-sm text-white">{formula}</code>
    </div>
  );
}

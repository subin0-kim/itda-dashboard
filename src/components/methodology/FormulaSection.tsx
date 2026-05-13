export function FormulaSection() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">점수 산식</h2>
      <div className="mt-4 space-y-4">
        <FormulaBlock
          title="시설 접근 점수"
          formula="FacilityScore(g, t) = max(0, 100 x (1 - D(g, t) / D_limit(t)))"
        />
        <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
          <p>g: 250m 격자</p>
          <p>t: 시설 유형</p>
          <p>D(g, t): 격자 중심점에서 가장 가까운 시설 t까지의 거리</p>
          <p>D_limit(t): 시설 유형별 기준거리</p>
        </div>
        <FormulaBlock
          title="격자 통합 점수"
          formula="GridStrollerScore = 0.30 x MedicalScore + 0.30 x EducationScore + 0.20 x AdminScore + 0.20 x LeisureScore"
        />
        <FormulaBlock title="구별 점수" formula="DistrictStrollerScore = 해당 구에 포함된 GridStrollerScore의 평균" />
        <p className="text-sm leading-6 text-slate-600">
          영유아 인구 가중치가 준비된 경우, 구별 점수는 영유아 수요 가중 평균으로 확장할 수 있습니다.
        </p>
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

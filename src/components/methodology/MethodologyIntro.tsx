import { LIMITATION_TEXT } from "../../utils/methodology";

export function MethodologyIntro() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6">
      <p className="text-sm font-medium text-slate-500">Methodology</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-950">방법론과 데이터</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        250m 격자 기반 유모차 생활보행 점수는 어떻게 계산되었나요?
      </p>
      <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-600">
        잇다(:connect)는 서울의 의료, 행정, 교육, 여가 시설 접근성을 250m 격자 단위로 계산해 구별 아이동반 친화점수로 집계합니다.
      </p>
      <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600">{LIMITATION_TEXT}</p>
    </section>
  );
}

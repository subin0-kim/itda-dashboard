import { LIMITATION_TEXT } from "../../utils/methodology";

const LIMITATIONS = [
  "본 점수는 실제 유모차 통행 가능 여부를 확정하지 않습니다.",
  "보도 폭, 턱, 단차, 공사, 불법주정차, 노면 상태는 반영되지 않을 수 있습니다.",
  "시설 운영시간, 시설 품질, 수용 가능 인원은 반영되지 않을 수 있습니다.",
  "직선거리 또는 평면거리를 사용할 경우 실제 보행거리와 차이가 날 수 있습니다.",
  "대형상업시설 등 optional 데이터가 없으면 일부 카테고리 산식이 대체될 수 있습니다.",
  "낮은 점수는 해당 구를 부정적으로 평가하기 위한 것이 아니라 개선 여지를 탐색하기 위한 정보입니다.",
];

export function LimitationsSection() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">한계와 주의사항</h2>
      <ul className="mt-4 space-y-2">
        {LIMITATIONS.map((item) => (
          <li key={item} className="rounded-md bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">
            {item}
          </li>
        ))}
      </ul>
      <p className="mt-4 rounded-md bg-indigo-50 p-3 text-sm leading-6 text-indigo-950">{LIMITATION_TEXT}</p>
    </section>
  );
}

import { AlertCircle } from "lucide-react";

export const LIMITATION_NOTICE_TEXT =
  "본 점수는 실제 유모차 통행 가능 여부를 확정하는 지표가 아니라, 공개데이터 기반 생활시설 접근성을 비교하기 위한 시각화 지표입니다. 실제 현장 여건은 보도 폭, 단차, 공사, 불법주정차, 시설 운영시간 등에 따라 달라질 수 있습니다.";

export function LimitationNotice({ compact = false }: { compact?: boolean }) {
  return (
    <section className={["rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-950", compact ? "p-3" : "p-4"].join(" ")}>
      <div className="flex gap-2">
        <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p className={compact ? "text-xs leading-5" : "text-sm leading-6"}>{LIMITATION_NOTICE_TEXT}</p>
      </div>
    </section>
  );
}

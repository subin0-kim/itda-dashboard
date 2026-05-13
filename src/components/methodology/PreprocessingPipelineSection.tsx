import type { Metadata } from "../../types/data";
import { DEFAULT_PREPROCESSING_SCRIPTS } from "../../utils/methodology";

interface PreprocessingPipelineSectionProps {
  metadata: Metadata | null;
}

export function PreprocessingPipelineSection({ metadata }: PreprocessingPipelineSectionProps) {
  const scripts = metadata?.preprocessing_scripts?.length ? metadata.preprocessing_scripts : DEFAULT_PREPROCESSING_SCRIPTS;
  const fromMetadata = Boolean(metadata?.preprocessing_scripts?.length);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">전처리 파이프라인</h2>
      {!fromMetadata ? (
        <p className="mt-3 text-sm text-slate-500">
          전처리 스크립트 정보가 metadata.json에 기록되어 있지 않습니다. 아래는 프로젝트의 기본 전처리 스크립트 목록입니다.
        </p>
      ) : null}
      <ol className="mt-4 space-y-2">
        {scripts.map((script, index) => (
          <li key={`${script}-${index}`} className="rounded-md bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
            {index + 1}. {script}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm leading-6 text-slate-600">
        웹 애플리케이션은 거리 계산이나 점수 계산을 수행하지 않고, 전처리 단계에서 생성된 public/data 파일만 읽어 시각화합니다.
      </p>
    </section>
  );
}

import { Database } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  message?: string;
  missingFiles?: string[];
}

export function EmptyState({
  title = "데이터 준비 필요",
  message = "전처리된 데이터 파일이 필요합니다. data/raw에 원천 데이터를 배치한 뒤 Python 전처리 파이프라인을 실행해 public/data 파일을 생성해 주세요.",
  missingFiles = [],
}: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-700">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-white p-2 text-slate-500 shadow-sm">
          <Database size={20} aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm leading-6">{message}</p>
          {missingFiles.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xs text-slate-500">
              {missingFiles.map((file) => (
                <li key={file}>
                  <code>{file}</code>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

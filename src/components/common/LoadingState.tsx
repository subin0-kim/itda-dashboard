export function LoadingState({ message = "데이터를 불러오는 중입니다." }: { message?: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">{message}</div>;
}

export function ErrorState({ message = "데이터를 불러올 수 없음" }: { message?: string }) {
  return <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">{message}</div>;
}

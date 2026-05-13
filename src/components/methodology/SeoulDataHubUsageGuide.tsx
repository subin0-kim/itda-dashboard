export function SeoulDataHubUsageGuide() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">서울 데이터 허브 활용 안내</h2>
      <div className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
        <p>서울 데이터 허브/열린데이터광장에서 데이터를 검색하고 다운로드 또는 API 방식으로 활용합니다.</p>
        <p>데이터설명서를 통해 컬럼, 기준시점, 좌표계, 갱신주기를 확인합니다.</p>
        <p>수집한 원천 데이터는 Python 전처리 후 지도와 차트에 사용할 public/data 산출물로 변환합니다.</p>
        <p>실제 사용 데이터 목록은 metadata.json의 source_datasets 기준으로 표시합니다.</p>
        <p>활용 화면 캡처는 별도 제출 문서에 포함할 수 있습니다.</p>
      </div>
    </section>
  );
}

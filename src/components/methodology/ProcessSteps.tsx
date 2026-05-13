import { PROCESS_STEPS } from "../../utils/methodology";

export function ProcessSteps() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">전체 계산 흐름</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {PROCESS_STEPS.map((step, index) => (
          <div key={step} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500">Step {index + 1}</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{step}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

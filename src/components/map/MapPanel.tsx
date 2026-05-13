import { DistrictMapPlaceholder } from "./DistrictMapPlaceholder";

interface MapPanelProps {
  title: string;
  description: string;
}

export function MapPanel({ title, description }: MapPanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <DistrictMapPlaceholder title={title} description={description} />
    </section>
  );
}

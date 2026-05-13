import { BASEMAP_ERROR_MESSAGE } from "../../config/mapStyle";

export function BasemapErrorBanner() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center p-3">
      <div className="pointer-events-auto max-w-md rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 shadow-sm">
        {BASEMAP_ERROR_MESSAGE}
      </div>
    </div>
  );
}

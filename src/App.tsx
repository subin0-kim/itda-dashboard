import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { ROUTES } from "./config/routes";
import { BenchmarkPage } from "./pages/BenchmarkPage";
import { CategoryDetailPage } from "./pages/CategoryDetailPage";
import { DistrictDetailPage } from "./pages/DistrictDetailPage";
import { DistrictGuidePage } from "./pages/DistrictGuidePage";
import { MethodologyPage } from "./pages/MethodologyPage";
import { OverviewPage } from "./pages/OverviewPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path={ROUTES.overview} element={<OverviewPage />} />
        <Route path={ROUTES.districtGuide} element={<DistrictGuidePage />} />
        <Route path={ROUTES.category} element={<CategoryDetailPage />} />
        <Route path={ROUTES.district} element={<DistrictDetailPage />} />
        <Route path={ROUTES.benchmark} element={<BenchmarkPage />} />
        <Route path={ROUTES.methodology} element={<MethodologyPage />} />
        <Route path="*" element={<Navigate to={ROUTES.overview} replace />} />
      </Route>
    </Routes>
  );
}

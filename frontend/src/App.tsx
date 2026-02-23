import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import Dashboard from './pages/Dashboard';
import AnalysisPage from './pages/Analysis';
import ProvenanceGraphPage from './pages/ProvenanceGraph';
import SocialTrackerPage from './pages/SocialTracker';
import BatchAnalysisPage from './pages/BatchAnalysis';
import ForensicsReportPage from './pages/ForensicsReport';
import SettingsPage from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public routes (no sidebar) ── */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ── Protected routes (with sidebar layout) ── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/"          element={<Dashboard />} />
            <Route path="/analysis"  element={<AnalysisPage />} />
            <Route path="/provenance"element={<ProvenanceGraphPage />} />
            <Route path="/social"    element={<SocialTrackerPage />} />
            <Route path="/batch"     element={<BatchAnalysisPage />} />
            <Route path="/report"    element={<ForensicsReportPage />} />
            <Route path="/settings"  element={<SettingsPage />} />
          </Route>
        </Route>

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

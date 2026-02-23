import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
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
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/provenance" element={<ProvenanceGraphPage />} />
          <Route path="/social" element={<SocialTrackerPage />} />
          <Route path="/batch" element={<BatchAnalysisPage />} />
          <Route path="/report" element={<ForensicsReportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

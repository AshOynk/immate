import { Routes, Route } from 'react-router-dom';
import { ProgressProvider } from './context/ProgressContext';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Lesson from './pages/Lesson';
import ComplianceSubmit from './pages/ComplianceSubmit';
import ComplianceDashboard from './pages/ComplianceDashboard';
import ComplianceRewards from './pages/ComplianceRewards';
import SendRequest from './pages/SendRequest';
import WelfareCheckIn from './pages/WelfareCheckIn';
import ResidentDashboard from './pages/ResidentDashboard';

export default function App() {
  return (
    <AuthProvider>
      <ProgressProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<ResidentDashboard />} />
            <Route path="/dashboard" element={<ResidentDashboard />} />
            <Route path="/learn" element={<Home />} />
            <Route path="/lesson/:id" element={<Lesson />} />
            <Route path="/compliance" element={<ComplianceSubmit />} />
            <Route path="/compliance/dashboard" element={<ComplianceDashboard />} />
            <Route path="/compliance/request" element={<SendRequest />} />
            <Route path="/compliance/rewards" element={<ComplianceRewards />} />
            <Route path="/welfare" element={<WelfareCheckIn />} />
          </Routes>
        </Layout>
      </ProgressProvider>
    </AuthProvider>
  );
}

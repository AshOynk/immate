import { Routes, Route } from 'react-router-dom';
import { ProgressProvider } from './context/ProgressContext';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Lesson from './pages/Lesson';
import Login from './pages/Login';
import ComplianceSubmit from './pages/ComplianceSubmit';
import ComplianceDashboard from './pages/ComplianceDashboard';
import ComplianceRewards from './pages/ComplianceRewards';
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
            <Route path="/login" element={<Login />} />
            <Route path="/learn" element={<Home />} />
            <Route path="/lesson/:id" element={<Lesson />} />
            <Route path="/compliance" element={<ComplianceSubmit />} />
            <Route path="/compliance/dashboard" element={<ProtectedRoute requireAdmin><ComplianceDashboard /></ProtectedRoute>} />
            <Route path="/compliance/rewards" element={<ComplianceRewards />} />
            <Route path="/welfare" element={<WelfareCheckIn />} />
          </Routes>
        </Layout>
      </ProgressProvider>
    </AuthProvider>
  );
}

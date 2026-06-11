import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import TripsPage from '@/pages/TripsPage';
import BillsPage from '@/pages/BillsPage';
import MembersPage from '@/pages/MembersPage';
import SettlementPage from '@/pages/SettlementPage';
import BudgetPage from '@/pages/BudgetPage';
import StatisticsPage from '@/pages/StatisticsPage';
import ExportPage from '@/pages/ExportPage';

function AppContent() {
  const location = useLocation();
  const showNav = !location.pathname.startsWith('/trips') || true;

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<Navigate to="/trips" replace />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/bills" element={<BillsPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/settlement" element={<SettlementPage />} />
        <Route path="/budget" element={<BudgetPage />} />
        <Route path="/statistics" element={<StatisticsPage />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="*" element={<Navigate to="/trips" replace />} />
      </Routes>
      {showNav && <BottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

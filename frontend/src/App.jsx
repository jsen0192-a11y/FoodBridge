import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Landing from './pages/Landing';
import DonorDashboard from './pages/DonorDashboard';
import NgoDashboard from './pages/NgoDashboard';
import AdminDashboard from './pages/AdminDashboard';

// Route Protection Wrapper (Bypassed: Allows all dashboards directly)
function ProtectedRoute({ children }) {
  return children;
}

// Side-by-Side Dashboard Layout Wrapper
function DashboardLayout({ children, role }) {
  return (
    <div className="dashboard-grid animate-fade-in">
      <Sidebar role={role} />
      <main className="dashboard-content">
        {children}
      </main>
    </div>
  );
}

function MainAppRoutes() {
  return (
    <div className="app-main-wrapper">
      <Navbar />
      <Routes>
        {/* Public Landing Home */}
        <Route path="/" element={<Landing />} />

        {/* Donor Dashboard */}
        <Route 
          path="/dashboard/donor/*" 
          element={
            <ProtectedRoute>
              <DashboardLayout role="donor">
                <Routes>
                  <Route path="/" element={<DonorDashboard />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        {/* NGO Dashboard */}
        <Route 
          path="/dashboard/ngo/*" 
          element={
            <ProtectedRoute>
              <DashboardLayout role="ngo">
                <Routes>
                  <Route path="/" element={<NgoDashboard />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        {/* Admin Dashboard */}
        <Route 
          path="/dashboard/admin/*" 
          element={
            <ProtectedRoute>
              <DashboardLayout role="admin">
                <Routes>
                  <Route path="/" element={<AdminDashboard />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        {/* Fallback Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <MainAppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

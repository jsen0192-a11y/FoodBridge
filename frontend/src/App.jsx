import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import DonorDashboard from './pages/DonorDashboard';
import NgoDashboard from './pages/NgoDashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import AdminDashboard from './pages/AdminDashboard';

// Route Protection Wrapper
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner"></div>
        <p>Initializing FoodBridge...</p>
        <style>{`
          .loading-page {
            height: calc(100vh - 75px);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: var(--text-secondary);
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid var(--border-color);
            border-top: 4px solid var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 1rem;
          }
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/dashboard/${user.role}`} replace />;
  }

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
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Donor Dashboard */}
        <Route 
          path="/dashboard/donor/*" 
          element={
            <ProtectedRoute allowedRoles={['donor']}>
              <DashboardLayout role="donor">
                <Routes>
                  <Route path="/" element={<DonorDashboard />} />
                  <Route path="/history" element={<DonorDashboard />} /> {/* Combined view handles tabs */}
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        {/* NGO Dashboard */}
        <Route 
          path="/dashboard/ngo/*" 
          element={
            <ProtectedRoute allowedRoles={['ngo']}>
              <DashboardLayout role="ngo">
                <Routes>
                  <Route path="/" element={<NgoDashboard />} />
                  <Route path="/accepted" element={<NgoDashboard />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        {/* Volunteer Dashboard */}
        <Route 
          path="/dashboard/volunteer/*" 
          element={
            <ProtectedRoute allowedRoles={['volunteer']}>
              <DashboardLayout role="volunteer">
                <Routes>
                  <Route path="/" element={<VolunteerDashboard />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />

        {/* Admin Dashboard */}
        <Route 
          path="/dashboard/admin/*" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DashboardLayout role="admin">
                <Routes>
                  <Route path="/" element={<AdminDashboard />} />
                  <Route path="/verifications" element={<AdminDashboard />} />
                  <Route path="/users" element={<AdminDashboard />} />
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

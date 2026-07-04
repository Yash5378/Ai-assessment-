import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import Jobs from './pages/candidate/Jobs';
import JobDetail from './pages/candidate/JobDetail';
import MyApplications from './pages/candidate/MyApplications';
import Dashboard from './pages/hr/Dashboard';
import ManageJobs from './pages/hr/ManageJobs';
import JobApplicants from './pages/hr/JobApplicants';

/**
 * Sends each visitor to the right home: HR to their dashboard, candidates
 * to the job board, guests to login.
 */
function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loader">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'HR' ? '/hr' : '/jobs'} replace />;
}

/**
 * Login/register are for guests only — an authenticated user is sent home.
 */
function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loader">Loading…</div>;
  if (user) return <Navigate to={user.role === 'HR' ? '/hr' : '/jobs'} replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

          {/* Candidate area */}
          <Route path="/jobs" element={<ProtectedRoute role="CANDIDATE"><Jobs /></ProtectedRoute>} />
          <Route path="/jobs/:id" element={<ProtectedRoute role="CANDIDATE"><JobDetail /></ProtectedRoute>} />
          <Route path="/my-applications" element={<ProtectedRoute role="CANDIDATE"><MyApplications /></ProtectedRoute>} />

          {/* HR area */}
          <Route path="/hr" element={<ProtectedRoute role="HR"><Dashboard /></ProtectedRoute>} />
          <Route path="/hr/jobs" element={<ProtectedRoute role="HR"><ManageJobs /></ProtectedRoute>} />
          <Route path="/hr/jobs/:id/applicants" element={<ProtectedRoute role="HR"><JobApplicants /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}

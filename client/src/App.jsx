import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.js';
import AssessmentPreviewPage from './pages/AssessmentPreviewPage.jsx';
import AssessmentSetupPage from './pages/AssessmentSetupPage.jsx';
import AssessmentPage from './pages/AssessmentPage.jsx';
import AssessmentSubmittedPage from './pages/AssessmentSubmittedPage.jsx';
import AssessmentResultsPage from './pages/AssessmentResultsPage.jsx';
import AssessmentReviewPage from './pages/AssessmentReviewPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import HomePage from './pages/HomePage.jsx';
import JobDetailPage from './pages/JobDetailPage.jsx';
import JobsPage from './pages/JobsPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NewJobPage from './pages/NewJobPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import PublicOnlyRoute from './routes/PublicOnlyRoute.jsx';

export default function App() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <NavLink className="font-semibold text-slate-900" to={user ? '/dashboard' : '/'}>Interview Assessment</NavLink>
          <div className="flex items-center gap-4 text-sm font-medium">
            {user ? <><NavLink to="/jobs">Job analyses</NavLink><NavLink to="/profile">Profile</NavLink><button className="text-slate-600 hover:text-slate-950" onClick={signOut}>Log out</button></> : <><NavLink to="/login">Log in</NavLink><NavLink className="rounded-lg bg-indigo-600 px-3 py-2 text-white" to="/register">Register</NavLink></>}
          </div>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/jobs/new" element={<NewJobPage />} />
            <Route path="/jobs/:jobProfileId" element={<JobDetailPage />} />
            <Route path="/jobs/:jobProfileId/assessment-setup" element={<AssessmentSetupPage />} />
            <Route path="/assessments/:assessmentId" element={<AssessmentPreviewPage />} />
            <Route path="/assessments/:assessmentId/take" element={<AssessmentPage />} />
            <Route path="/assessments/:assessmentId/submitted" element={<AssessmentSubmittedPage />} />
            <Route path="/assessments/:assessmentId/results" element={<AssessmentResultsPage />} />
            <Route path="/assessments/:assessmentId/results/review" element={<AssessmentReviewPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}

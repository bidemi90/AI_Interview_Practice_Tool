import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function PublicOnlyRoute() {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-8 text-center text-slate-600">Loading…</p>;
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

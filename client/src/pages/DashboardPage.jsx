import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function DashboardPage() {
  const { user } = useAuth();
  const activeAssessmentId = localStorage.getItem('activeAssessmentId');
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Dashboard</p>
      <h1 className="mt-3 text-4xl font-bold text-slate-950">Welcome, {user.name}</h1>
      <p className="mt-4 max-w-2xl text-slate-600">Your account is ready. Interview assessments will be introduced in a later phase.</p>
      <div className="mt-8 flex flex-wrap gap-3">{activeAssessmentId && <Link className="rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white" to={`/assessments/${activeAssessmentId}/take`}>Resume assessment</Link>}<Link className="rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white" to="/jobs/new">Set up a job</Link><Link className="rounded-lg border border-slate-300 px-4 py-2.5 font-semibold" to="/profile">Complete your profile</Link></div>
    </section>
  );
}

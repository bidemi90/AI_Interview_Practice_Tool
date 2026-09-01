import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardPerformance, getDashboardSummary } from '../api/dashboardApi.js';
import AssessmentHistory from '../components/AssessmentHistory.jsx';
import FormError from '../components/FormError.jsx';
import { useAuth } from '../hooks/useAuth.js';
import PropTypes from 'prop-types';

function ScoreChart({ points }) {
  if (!points.length) return <p className="mt-4 text-sm text-slate-500">Score history will appear after you score an assessment.</p>;
  const coordinates = points.map((item, index) => `${points.length === 1 ? 50 : (index / (points.length - 1)) * 100},${100 - item.score}`).join(' ');
  return <div className="mt-4"><svg aria-label="Assessment score history" className="h-44 w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="0" y1="100" x2="100" y2="100" stroke="#cbd5e1" /><line x1="0" y1="0" x2="0" y2="100" stroke="#cbd5e1" /><polyline fill="none" stroke="#4f46e5" strokeWidth="2" vectorEffect="non-scaling-stroke" points={coordinates} />{points.map((item, index) => <circle key={item.assessmentId} cx={points.length === 1 ? 50 : (index / (points.length - 1)) * 100} cy={100 - item.score} r="2" fill="#4f46e5"><title>{new Date(item.date).toLocaleDateString()}: {item.score}%</title></circle>)}</svg><div className="flex justify-between text-xs text-slate-500"><span>{new Date(points[0].date).toLocaleDateString()}</span><span>{new Date(points.at(-1).date).toLocaleDateString()}</span></div></div>;
}
ScoreChart.propTypes = { points: PropTypes.arrayOf(PropTypes.shape({ assessmentId: PropTypes.string.isRequired, date: PropTypes.string.isRequired, score: PropTypes.number.isRequired })).isRequired };

function SectionList({ title, sections }) {
  return <section className="rounded-xl bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">{title}</h2><div className="mt-4 space-y-4">{sections.length ? sections.map((item) => <div key={item.normalizedSectionKey}><div className="flex justify-between gap-3 text-sm"><span className="font-medium">{item.section}</span><span>{item.proficiencyScore}%</span></div><div className="mt-1 h-2 rounded bg-slate-100"><div className="h-2 rounded bg-indigo-500" style={{ width: `${item.proficiencyScore}%` }} /></div><p className="mt-1 text-xs capitalize text-slate-500">{item.attempts} attempt{item.attempts === 1 ? '' : 's'} · {item.trend}</p></div>) : <p className="text-sm text-slate-500">No scored section data yet.</p>}</div></section>;
}
SectionList.propTypes = { title: PropTypes.string.isRequired, sections: PropTypes.arrayOf(PropTypes.shape({ normalizedSectionKey: PropTypes.string.isRequired, section: PropTypes.string.isRequired, proficiencyScore: PropTypes.number.isRequired, attempts: PropTypes.number.isRequired, trend: PropTypes.string.isRequired })).isRequired };

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { Promise.all([getDashboardSummary(), getDashboardPerformance()]).then(([one, two]) => { setSummary(one); setPerformance(two); }).catch(setError); }, []);
  if (error) return <section className="mx-auto max-w-6xl px-6 py-16"><FormError error={error} /></section>;
  if (!summary || !performance) return <p className="p-16 text-center text-slate-500">Loading dashboard…</p>;
  const cards = [['Assessments Completed', summary.completedAssessments], ['Average Score', summary.averageScore == null ? '—' : `${summary.averageScore}%`], ['Best Score', summary.bestScore == null ? '—' : `${summary.bestScore}%`], ['Latest Score', summary.latestScore == null ? '—' : `${summary.latestScore}%`]];
  return <section className="mx-auto max-w-6xl px-6 py-12"><p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Dashboard</p><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="mt-2 text-4xl font-bold">Welcome, {user.name}</h1>{summary.latestReadinessBand && <p className="mt-2 text-slate-600">Current readiness: <strong>{summary.latestReadinessBand}</strong></p>}</div><div className="flex gap-3"><Link className="rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white" to="/jobs/new">Analyze a new job</Link><Link className="rounded-lg border border-slate-300 px-4 py-2.5 font-semibold" to="/jobs">Job History</Link></div></div>
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, value]) => <article className="rounded-xl bg-white p-5 shadow-sm" key={label}><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></article>)}</div>
    <section className="mt-6 rounded-xl bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Score history</h2><ScoreChart points={summary.scoreHistory} /></section>
    <div className="mt-6 grid gap-6 lg:grid-cols-2"><SectionList title="Strongest Areas" sections={summary.strongestSections} /><SectionList title="Areas to Improve" sections={summary.weakestSections} /></div>
    <div className="mt-6"><SectionList title="Performance by Section" sections={performance.sections} /></div>
    <div className="mt-6">{summary.recentAssessments.length ? <AssessmentHistory assessments={summary.recentAssessments} title="Recent Assessments" /> : <section className="rounded-xl bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Recent Assessments</h2><p className="mt-2 text-slate-600">No assessments yet.</p></section>}</div>
  </section>;
}

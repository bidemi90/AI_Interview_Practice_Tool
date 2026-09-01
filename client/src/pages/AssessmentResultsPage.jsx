import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useParams } from 'react-router-dom';
import { getAssessmentResults, retryAssessmentFeedback } from '../api/assessmentsApi.js';
import FormError from '../components/FormError.jsx';

function FeedbackList({ title, items }) {
  return <div><h3 className="font-semibold">{title}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">{items.map((item) => <li key={item}>{item}</li>)}</ul></div>;
}
FeedbackList.propTypes = { title: PropTypes.string.isRequired, items: PropTypes.arrayOf(PropTypes.string).isRequired };

export default function AssessmentResultsPage() {
  const { assessmentId } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState(false);
  useEffect(() => { getAssessmentResults(assessmentId).then(setResult).catch(setError); }, [assessmentId]);
  const retry = async () => {
    setRetrying(true); setError(null);
    try { setResult(await retryAssessmentFeedback(assessmentId)); } catch (requestError) { setError(requestError); }
    finally { setRetrying(false); }
  };
  if (error && !result) return <section className="mx-auto max-w-3xl px-6 py-16"><FormError error={error} /></section>;
  if (!result) return <p className="p-16 text-center text-slate-600">Loading results…</p>;
  const sectionByName = new Map(result.sectionScores.map((item) => [item.section, item]));
  return <section className="mx-auto max-w-5xl space-y-7 px-6 py-14">
    <header><p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Assessment results</p><h1 className="mt-2 text-4xl font-bold">{result.jobTitle}</h1><p className="mt-2 capitalize text-slate-600">{result.mode} assessment · Completed {new Date(result.submittedAt).toLocaleDateString()}</p></header>
    <section className="grid gap-4 rounded-xl bg-white p-6 shadow-sm sm:grid-cols-4"><div><p className="text-sm text-slate-500">Points</p><p className="text-3xl font-bold">{result.earnedPoints} / {result.availablePoints}</p></div><div><p className="text-sm text-slate-500">Score</p><p className="text-3xl font-bold text-indigo-600">{result.percentageCorrect}%</p></div><div><p className="text-sm text-slate-500">Readiness</p><p className="text-xl font-bold">{result.readinessBand}</p></div><div><p className="text-sm text-slate-500">Scored</p><p className="text-xl font-bold">{result.scoredQuestions} / {result.totalQuestions}</p></div></section>
    <section className="rounded-xl bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Performance Summary</h2><div className="mt-4 grid gap-4 sm:grid-cols-3"><p><strong>{result.correctAnswers}</strong><br /><span className="text-sm text-slate-500">Correct</span></p><p><strong>{result.incorrectAnswers}</strong><br /><span className="text-sm text-slate-500">Incorrect</span></p><p><strong>{result.totalQuestions}</strong><br /><span className="text-sm text-slate-500">Total questions</span></p></div></section>
    <section className="rounded-xl bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Section Performance</h2><div className="mt-5 space-y-4">{result.sectionScores.map((item) => <div key={item.section}><div className="flex justify-between"><span>{item.section}</span><strong>{item.percentage}%</strong></div><div className="mt-2 h-2 rounded bg-slate-100"><div className="h-full rounded bg-indigo-600" style={{ width: `${item.percentage}%` }} /></div></div>)}</div></section>
    <div className="grid gap-6 sm:grid-cols-2"><section className="rounded-xl bg-emerald-50 p-6"><h2 className="text-xl font-semibold text-emerald-900">Strong Areas</h2><ul className="mt-3 space-y-2">{result.strongAreas.length ? result.strongAreas.map((name) => <li key={name}>{name} — {sectionByName.get(name)?.percentage}%</li>) : <li>None reached 75% yet.</li>}</ul></section><section className="rounded-xl bg-amber-50 p-6"><h2 className="text-xl font-semibold text-amber-900">Areas to Improve</h2><ul className="mt-3 space-y-2">{result.weakAreas.length ? result.weakAreas.map((name) => <li key={name}>{name} — {sectionByName.get(name)?.percentage}%</li>) : <li>No section is below 60%.</li>}</ul></section></div>
    <section className="rounded-xl bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Coaching Feedback</h2>{result.feedbackStatus === 'completed' ? <div className="mt-4 space-y-5"><p>{result.aiFeedback.summary}</p><div className="grid gap-5 sm:grid-cols-2"><FeedbackList title="Strengths" items={result.aiFeedback.strengths} /><FeedbackList title="Weaknesses" items={result.aiFeedback.weaknesses} /><FeedbackList title="Topics to Revise" items={result.aiFeedback.topicsToRevise} /><FeedbackList title="Recommended Next Steps" items={result.aiFeedback.recommendedNextSteps} /></div></div> : <div className="mt-4"><p className="text-slate-600">Your assessment has been scored successfully, but detailed AI feedback is temporarily unavailable.</p><button className="mt-4 rounded bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={retrying} onClick={() => void retry()}>{retrying ? 'Retrying feedback…' : 'Retry Feedback'}</button></div>}{error && <div className="mt-4"><FormError error={error} /></div>}</section>
    <div className="flex gap-4"><Link className="rounded bg-indigo-600 px-4 py-2 font-semibold text-white" to={`/assessments/${assessmentId}/results/review`}>Review Answers</Link><Link className="px-4 py-2 font-semibold text-indigo-600" to="/dashboard">Dashboard</Link></div>
  </section>;
}

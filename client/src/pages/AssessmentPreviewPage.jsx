import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchAssessment } from '../api/assessmentsApi.js';
import FormError from '../components/FormError.jsx';

export default function AssessmentPreviewPage() {
  const { assessmentId } = useParams();
  const [assessment, setAssessment] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { fetchAssessment(assessmentId).then(setAssessment).catch(setError); }, [assessmentId]);
  if (error) return <section className="mx-auto max-w-3xl px-6 py-16"><FormError error={error} /></section>;
  if (!assessment) return <p className="p-16 text-center text-slate-600">Loading assessment…</p>;

  const categoryCount = (category) => assessment.blueprint.filter((section) => section.category === category).reduce((sum, section) => sum + section.questionCount, 0);
  const difficulty = assessment.blueprint.reduce((totals, section) => {
    for (const level of ['easy', 'medium', 'hard']) totals[level] += section.difficultyDistribution[level] || 0;
    return totals;
  }, { easy: 0, medium: 0, hard: 0 });

  return (
    <section className="mx-auto max-w-5xl px-6 py-14">
      <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">Assessment ready</p>
      <h1 className="mt-2 text-4xl font-bold text-slate-950">{assessment.jobSnapshot.jobTitle}</h1>
      <p className="mt-3 capitalize text-slate-600">{assessment.mode} assessment</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3"><div className="rounded-xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Total questions</p><p className="mt-1 text-3xl font-bold">{assessment.totalQuestions}</p></div><div className="rounded-xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">General questions</p><p className="mt-1 text-3xl font-bold">{categoryCount('general')}</p></div><div className="rounded-xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Job-specific questions</p><p className="mt-1 text-3xl font-bold">{categoryCount('job_specific')}</p></div></div>
      <div className="mt-8 grid gap-6 sm:grid-cols-2"><section className="rounded-xl bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Sections covered</h2><ul className="mt-4 space-y-2">{assessment.blueprint.map((section) => <li className="flex justify-between gap-4 text-sm" key={`${section.category}-${section.section}`}><span>{section.section}</span><span className="text-slate-500">{section.questionCount} questions</span></li>)}</ul></section><section className="rounded-xl bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Difficulty summary</h2><dl className="mt-4 space-y-3 capitalize">{Object.entries(difficulty).map(([level, count]) => <div className="flex justify-between" key={level}><dt>{level}</dt><dd className="font-semibold">{count}</dd></div>)}</dl></section></div>
      <Link className="mt-8 inline-block rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white" to={`/assessments/${assessment.id}/take`}>Start Assessment</Link>
      <Link className="ml-4 text-sm font-semibold text-indigo-600" to={`/jobs/${assessment.jobProfileId}`}>Back to job analysis</Link>
    </section>
  );
}

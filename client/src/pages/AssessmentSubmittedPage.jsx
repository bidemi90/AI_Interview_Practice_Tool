import { Link, useParams } from 'react-router-dom';

export default function AssessmentSubmittedPage() {
  const { assessmentId } = useParams();
  return <section className="mx-auto max-w-2xl px-6 py-24 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div><h1 className="mt-6 text-3xl font-bold text-slate-950">Assessment submitted successfully</h1><p className="mt-3 text-slate-600">Results will be available after scoring is introduced in the next phase.</p><p className="mt-2 text-xs text-slate-400">Assessment {assessmentId}</p><Link className="mt-8 inline-block rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white" to="/dashboard">Return to dashboard</Link></section>;
}

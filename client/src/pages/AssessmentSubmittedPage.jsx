import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchAssessment, getAssessmentResults, scoreAssessment } from '../api/assessmentsApi.js';
import FormError from '../components/FormError.jsx';

export default function AssessmentSubmittedPage() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [error, setError] = useState(null);
  const [scoring, setScoring] = useState(false);
  useEffect(() => {
    getAssessmentResults(assessmentId)
      .then(() => navigate(`/assessments/${assessmentId}/results`, { replace: true }))
      .catch(() => fetchAssessment(assessmentId).then(setAssessment).catch(setError));
  }, [assessmentId, navigate]);
  const processResults = async () => {
    setScoring(true); setError(null);
    try { await scoreAssessment(assessmentId); navigate(`/assessments/${assessmentId}/results`, { replace: true }); }
    catch (requestError) { setError(requestError); setScoring(false); }
  };
  if (error && !assessment) return <section className="mx-auto max-w-3xl px-6 py-16"><FormError error={error} /></section>;
  if (!assessment) return <p className="p-16 text-center text-slate-600">Loading submitted assessment…</p>;
  return <section className="mx-auto max-w-3xl px-6 py-14"><div className="rounded-xl bg-white p-7 shadow-sm"><p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">Assessment submitted</p><h1 className="mt-2 text-3xl font-bold">{assessment.jobTitle}</h1><p className="mt-2 capitalize text-slate-600">{assessment.mode} assessment · {assessment.answeredCount} of {assessment.totalQuestions} answered</p>
    <div className="mt-7 rounded-lg bg-indigo-50 p-4 text-indigo-900">Your answers are safely submitted. Process the assessment to calculate deterministic results and coaching feedback.</div>
    {error && <div className="mt-5"><FormError error={error} /></div>}
    <button className="mt-7 rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50" disabled={scoring} onClick={() => void processResults()}>{scoring ? 'Calculating results…' : 'Score Assessment'}</button>
    <div className="mt-6"><Link className="font-semibold text-indigo-600" to={`/jobs/${assessment.jobProfileId}`}>Back to job analysis</Link></div>
  </div></section>;
}

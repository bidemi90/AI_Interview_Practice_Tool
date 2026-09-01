import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchJob, getAssessmentsForJob } from '../api/jobsApi.js';
import AnalysisReview from '../components/AnalysisReview.jsx';
import AssessmentHistory from '../components/AssessmentHistory.jsx';
import FormError from '../components/FormError.jsx';
import { assessmentAction } from '../utils/assessmentActions.js';

function relevantAssessment(items) {
  return items.find((item) => item.status === 'in_progress')
    || items.find((item) => item.status === 'ready')
    || items.find((item) => item.status === 'generating')
    || (items[0]?.status === 'submitted' ? items[0] : null)
    || items.find((item) => item.status === 'generation_failed')
    || items[0];
}

const statusTitles = {
  ready: 'Assessment Ready', in_progress: 'Assessment In Progress', submitted: 'Assessment Completed',
  generation_failed: 'Generation Failed', generating: 'Generating Assessment',
};

export default function JobDetailPage() {
  const { jobProfileId } = useParams();
  const [jobProfile, setJobProfile] = useState(null);
  const [assessments, setAssessments] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    Promise.all([fetchJob(jobProfileId), getAssessmentsForJob(jobProfileId)])
      .then(([profile, items]) => { setJobProfile(profile); setAssessments(items); })
      .catch(setError);
  }, [jobProfileId]);
  if (error) return <section className="mx-auto max-w-3xl px-6 py-16"><FormError error={error} /><Link className="mt-6 inline-block text-indigo-600" to="/jobs">Return to job analyses</Link></section>;
  if (!jobProfile || !assessments) return <p className="p-16 text-center text-slate-600">Loading analysis and assessments…</p>;
  const primary = relevantAssessment(assessments);
  const action = primary ? assessmentAction(primary) : null;
  return <section className="mx-auto max-w-5xl space-y-8 px-6 py-14">
    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Assessment status</p>
      <h2 className="mt-2 text-2xl font-bold">{primary ? statusTitles[primary.status] : 'No assessment yet'}</h2>
      {primary?.status === 'in_progress' && <p className="mt-2 text-slate-600">{primary.answeredQuestionCount} of {primary.totalQuestions} questions answered</p>}
      {primary?.status === 'submitted' && <p className="mt-2 text-slate-600">Results will be available after scoring is implemented.</p>}
      <div className="mt-5 flex flex-wrap gap-3">{action && <Link className="rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white" to={action.to}>{action.label}</Link>}<Link className={primary ? 'rounded-lg border border-indigo-300 px-4 py-2.5 font-semibold text-indigo-700' : 'rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white'} to={`/jobs/${jobProfileId}/assessment-setup`}>{primary ? 'Generate New Assessment' : 'Generate Assessment'}</Link></div>
    </div>
    {assessments.length > 0 && <AssessmentHistory assessments={assessments} />}
    <AnalysisReview jobProfile={jobProfile} showAssessmentAction={false} />
  </section>;
}

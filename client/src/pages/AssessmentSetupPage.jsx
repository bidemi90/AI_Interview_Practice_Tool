import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createAssessment } from '../api/assessmentsApi.js';
import { fetchJob, getAssessmentPlan } from '../api/jobsApi.js';
import FormError from '../components/FormError.jsx';

const modes = [
  { key: 'quick', title: 'Quick Assessment', questions: 15, description: 'Short practice session' },
  { key: 'standard', title: 'Standard Assessment', questions: 30, description: 'Balanced interview preparation' },
  { key: 'full', title: 'Full Assessment', questions: 48, description: 'Comprehensive preparation' },
];

export default function AssessmentSetupPage() {
  const { jobProfileId } = useParams();
  const navigate = useNavigate();
  const [jobProfile, setJobProfile] = useState(null);
  const [mode, setMode] = useState('standard');
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    fetchJob(jobProfileId).then(setJobProfile).catch(setError);
  }, [jobProfileId]);

  useEffect(() => {
    setPlan(null);
    getAssessmentPlan(jobProfileId, mode).then(setPlan).catch(setError);
  }, [jobProfileId, mode]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const assessment = await createAssessment({ jobProfileId, mode });
      navigate(`/assessments/${assessment.id}`);
    } catch (requestError) {
      setError(requestError);
      setGenerating(false);
    }
  };

  if (error && !jobProfile) return <section className="mx-auto max-w-3xl px-6 py-16"><FormError error={error} /></section>;
  if (!jobProfile) return <p className="p-16 text-center text-slate-600">Loading job analysis…</p>;
  const general = jobProfile.analysis.recommendedSections.filter((section) => section.category === 'general');
  const specific = jobProfile.analysis.recommendedSections.filter((section) => section.category === 'job_specific');
  const selected = modes.find((item) => item.key === mode);

  if (generating) {
    return <section className="mx-auto max-w-2xl px-6 py-24 text-center"><div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" /><h1 className="mt-8 text-3xl font-bold text-slate-950">Preparing your interview assessment…</h1><p className="mt-3 text-slate-600">{selected.title} · {selected.questions} questions</p><p className="mt-2 text-sm text-slate-500">Generating and validating each section. Please keep this page open.</p></section>;
  }

  const sectionList = (title, sections) => <div><h2 className="font-semibold text-slate-900">{title}</h2><div className="mt-3 flex flex-wrap gap-2">{sections.map((section) => <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700" key={section.name}>{section.name}</span>)}</div></div>;
  return (
    <section className="mx-auto max-w-5xl px-6 py-14">
      <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Assessment setup</p>
      <h1 className="mt-2 text-4xl font-bold text-slate-950">{jobProfile.analysis.jobTitle}</h1>
      <div className="mt-8 grid gap-6 rounded-xl bg-white p-6 shadow-sm sm:grid-cols-2">{sectionList('General interview sections', general)}{sectionList('Job-specific interview sections', specific)}</div>
      <h2 className="mt-10 text-2xl font-bold text-slate-950">Choose an assessment mode</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">{modes.map((item) => <label className={`cursor-pointer rounded-xl border p-5 ${mode === item.key ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white'}`} key={item.key}><input className="sr-only" type="radio" name="mode" value={item.key} checked={mode === item.key} onChange={(event) => setMode(event.target.value)} /><span className="text-lg font-semibold text-slate-950">{item.title}</span><span className="mt-2 block text-2xl font-bold text-indigo-600">{item.questions} Questions</span><span className="mt-2 block text-sm text-slate-600">{item.description}</span></label>)}</div>
      {plan && <section className="mt-8 rounded-xl bg-white p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">Planned allocation</h2><span className="text-sm text-slate-500">{plan.totalQuestions} questions</span></div>{plan.adaptive && <p className="mt-3 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-800">This assessment places slightly more emphasis on areas where you need more practice.</p>}<div className="mt-5 grid gap-6 md:grid-cols-2">{['general', 'job_specific'].map((category) => <div key={category}><h3 className="font-semibold capitalize">{category.replace('_', '-')}</h3><div className="mt-2 space-y-2">{plan.sections.filter((item) => item.category === category).map((item) => <div className="flex items-center justify-between gap-3 text-sm" key={item.section}><span>{item.section}{item.needsMorePractice && item.adaptiveInfluenced ? <span className="ml-2 text-amber-700">Needs more practice</span> : null}</span><strong>{item.questionCount}</strong></div>)}</div></div>)}</div></section>}
      <div className="mt-8"><FormError error={error} /></div>
      <button className="mt-6 rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50" disabled={generating || !plan} onClick={generate}>Generate Assessment</button>
    </section>
  );
}

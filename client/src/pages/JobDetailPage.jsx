import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchJob } from '../api/jobsApi.js';
import AnalysisReview from '../components/AnalysisReview.jsx';
import FormError from '../components/FormError.jsx';

export default function JobDetailPage() {
  const { jobProfileId } = useParams();
  const [jobProfile, setJobProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchJob(jobProfileId).then(setJobProfile).catch(setError);
  }, [jobProfileId]);

  if (error) return <section className="mx-auto max-w-3xl px-6 py-16"><FormError error={error} /><Link className="mt-6 inline-block text-indigo-600" to="/jobs">Return to job analyses</Link></section>;
  if (!jobProfile) return <p className="p-16 text-center text-slate-600">Loading analysis…</p>;
  return <section className="mx-auto max-w-5xl px-6 py-14"><AnalysisReview jobProfile={jobProfile} /></section>;
}

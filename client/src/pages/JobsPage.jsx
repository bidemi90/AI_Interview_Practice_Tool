import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteJob, fetchJobs } from '../api/jobsApi.js';
import FormError from '../components/FormError.jsx';

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchJobs().then((result) => setJobs(result.items)).catch(setError).finally(() => setLoading(false));
  }, []);

  const remove = async (jobProfile) => {
    if (!window.confirm(`Delete the analysis for ${jobProfile.analysis.jobTitle}?`)) return;
    setDeletingId(jobProfile._id);
    setError(null);
    try {
      await deleteJob(jobProfile._id);
      setJobs((current) => current.filter((job) => job._id !== jobProfile._id));
    } catch (requestError) {
      setError(requestError);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="mx-auto max-w-5xl px-6 py-14">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Job history</p><h1 className="mt-2 text-4xl font-bold text-slate-950">Saved job analyses</h1></div><Link className="rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white" to="/jobs/new">Analyze another job</Link></div>
      <div className="mt-8"><FormError error={error} /></div>
      {loading ? <p className="mt-10 text-slate-600">Loading analyses…</p> : jobs.length === 0 ? <div className="mt-10 rounded-xl border border-dashed border-slate-300 p-10 text-center"><p className="text-slate-600">You have no saved job analyses yet.</p><Link className="mt-4 inline-block font-semibold text-indigo-600" to="/jobs/new">Set up your first job</Link></div> : <div className="mt-8 space-y-4">{jobs.map((job) => (
        <article className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5" key={job._id}>
          <div><h2 className="text-lg font-semibold text-slate-950">{job.analysis.jobTitle}</h2><p className="mt-1 text-sm capitalize text-slate-500">{job.sourceType.replace('_', ' ')} · {new Date(job.createdAt).toLocaleDateString()}</p></div>
          <div className="flex gap-3"><Link className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" to={`/jobs/${job._id}`}>Open</Link><button className="rounded-lg px-3 py-2 text-sm font-semibold text-red-600 disabled:opacity-50" disabled={deletingId === job._id} onClick={() => remove(job)}>{deletingId === job._id ? 'Deleting…' : 'Delete'}</button></div>
        </article>
      ))}</div>}
    </section>
  );
}

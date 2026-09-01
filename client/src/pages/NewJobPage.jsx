import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeJob, fetchRoles } from '../api/jobsApi.js';
import FormError from '../components/FormError.jsx';

export default function NewJobPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('description');
  const [roles, setRoles] = useState([]);
  const [jobDescription, setJobDescription] = useState('');
  const [predefinedRoleKey, setPredefinedRoleKey] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRoles().then(setRoles).catch(setError);
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = mode === 'description' ? { jobDescription } : { predefinedRoleKey };
      const jobProfile = await analyzeJob(payload);
      navigate(`/jobs/${jobProfile._id}`);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSubmitting(false);
    }
  };

  const descriptionValid = jobDescription.trim().length >= 80;
  return (
    <section className="mx-auto max-w-5xl px-6 py-14">
      <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Job setup</p>
      <h1 className="mt-2 text-4xl font-bold text-slate-950">What role are you preparing for?</h1>
      <div className="mt-8 flex gap-2 rounded-xl bg-slate-100 p-1">
        <button className={`flex-1 rounded-lg px-4 py-3 font-medium ${mode === 'description' ? 'bg-white shadow-sm' : ''}`} onClick={() => setMode('description')} type="button">Paste Job Description</button>
        <button className={`flex-1 rounded-lg px-4 py-3 font-medium ${mode === 'role' ? 'bg-white shadow-sm' : ''}`} onClick={() => setMode('role')} type="button">Select Job Role</button>
      </div>
      <form className="mt-8" onSubmit={submit}>
        <FormError error={error} />
        {mode === 'description' ? (
          <label className="mt-5 block font-medium text-slate-800">Job description
            <textarea className="mt-2 min-h-72 w-full rounded-xl border border-slate-300 p-4 font-normal" maxLength={15000} placeholder="Paste the complete job description here…" required value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} />
            <span className="mt-1 block text-sm text-slate-500">{jobDescription.length.toLocaleString()} / 15,000 characters · minimum 80</span>
          </label>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">{roles.map((role) => (
            <label className={`cursor-pointer rounded-xl border p-4 ${predefinedRoleKey === role.key ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white'}`} key={role.key}>
              <input className="sr-only" type="radio" name="role" value={role.key} checked={predefinedRoleKey === role.key} onChange={(event) => setPredefinedRoleKey(event.target.value)} />
              <span className="font-semibold text-slate-950">{role.title}</span><span className="mt-2 block text-sm text-slate-600">{role.description}</span>
            </label>
          ))}</div>
        )}
        <button className="mt-8 rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={submitting || (mode === 'description' ? !descriptionValid : !predefinedRoleKey)}>{submitting ? 'Analyzing job…' : 'Analyze job'}</button>
      </form>
    </section>
  );
}

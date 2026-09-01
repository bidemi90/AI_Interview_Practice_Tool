import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FormError from '../components/FormError.jsx';
import { useAuth } from '../hooks/useAuth.js';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await register(form);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-3xl font-bold text-slate-950">Create your account</h1>
      <p className="mt-2 text-slate-600">Start building your interview readiness profile.</p>
      <form className="mt-8 space-y-5" onSubmit={submit}>
        <FormError error={error} />
        <label className="block text-sm font-medium text-slate-700">Name
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" autoComplete="name" required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <label className="block text-sm font-medium text-slate-700">Email
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </label>
        <label className="block text-sm font-medium text-slate-700">Password
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        </label>
        <button className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60" disabled={submitting}>{submitting ? 'Creating account…' : 'Create account'}</button>
      </form>
      <p className="mt-6 text-sm text-slate-600">Already registered? <Link className="font-semibold text-indigo-600" to="/login">Sign in</Link></p>
    </section>
  );
}

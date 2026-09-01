import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 text-center">
      <p className="text-sm font-semibold text-indigo-600">404</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950">Page not found</h1>
      <Link className="mt-6 inline-block text-indigo-600 hover:text-indigo-500" to="/">
        Return home
      </Link>
    </section>
  );
}


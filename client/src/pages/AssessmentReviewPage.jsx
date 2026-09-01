import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getAssessmentReviewQuestions } from '../api/assessmentsApi.js';
import FormError from '../components/FormError.jsx';

export default function AssessmentReviewPage() {
  const { assessmentId } = useParams();
  const [questions, setQuestions] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { getAssessmentReviewQuestions(assessmentId).then(setQuestions).catch(setError); }, [assessmentId]);
  if (error) return <section className="mx-auto max-w-3xl px-6 py-16"><FormError error={error} /></section>;
  if (!questions) return <p className="p-16 text-center text-slate-600">Loading answer review…</p>;
  return <section className="mx-auto max-w-4xl px-6 py-14"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold uppercase text-indigo-600">Read-only review</p><h1 className="mt-2 text-3xl font-bold">Review Answers</h1></div><Link className="font-semibold text-indigo-600" to={`/assessments/${assessmentId}/results`}>Back to Results</Link></div>
    <div className="mt-8 space-y-6">{questions.map((item) => {
      const scored = item.gradingStatus === 'scored';
      const correct = scored && item.isCorrect;
      return <article className={`rounded-xl border-l-4 bg-white p-6 shadow-sm ${item.type === 'short_answer' ? 'border-indigo-400' : correct ? 'border-emerald-500' : 'border-rose-500'}`} key={item.questionId}><div className="flex flex-wrap justify-between gap-3"><span className="text-sm font-semibold text-indigo-600">Question {item.questionNumber} · {item.section}</span><span className="font-semibold">{item.pointsAwarded ?? 'Pending'} / {item.pointsAvailable} points</span></div><h2 className="mt-4 text-lg font-semibold">{item.question}</h2>{item.codeSnippet && <pre className="mt-4 overflow-x-auto rounded bg-slate-950 p-4 text-sm text-white"><code>{item.codeSnippet}</code></pre>}
        <dl className="mt-5 space-y-3"><div><dt className="text-sm text-slate-500">Your Answer</dt><dd>{item.userAnswer}</dd></div>{item.type !== 'short_answer' && <><div><dt className="text-sm text-slate-500">Correct Answer</dt><dd className="font-semibold text-emerald-700">{item.correctAnswer}</dd></div><div><dt className="text-sm text-slate-500">Result</dt><dd className={correct ? 'font-semibold text-emerald-700' : 'font-semibold text-rose-700'}>{correct ? 'Correct' : 'Incorrect'}</dd></div><div><dt className="text-sm text-slate-500">Explanation</dt><dd>{item.explanation}</dd></div></>}{item.type === 'short_answer' && <div><dt className="text-sm text-slate-500">Grading</dt><dd>{scored ? item.gradingFeedback : 'AI grading is temporarily unavailable for this answer.'}</dd></div>}</dl>
      </article>;
    })}</div>
  </section>;
}

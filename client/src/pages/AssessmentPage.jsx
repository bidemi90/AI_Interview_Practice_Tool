import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAssessmentQuestionByIndex, saveAssessmentAnswer, startAssessment, submitAssessment, updateCurrentQuestion } from '../api/assessmentsApi.js';
import FormError from '../components/FormError.jsx';

export default function AssessmentPage() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [savedAnswers, setSavedAnswers] = useState({});
  const [saveState, setSaveState] = useState('saved');
  const [error, setError] = useState(null);
  const answersRef = useRef({});
  const autosaveRef = useRef(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        const restored = await startAssessment(assessmentId);
        if (restored.status === 'submitted') {
          navigate(`/assessments/${assessmentId}/submitted`, { replace: true });
          return;
        }
        localStorage.setItem('activeAssessmentId', assessmentId);
        const answerMap = Object.fromEntries(restored.answers.map((item) => [item.questionId, item.answer]));
        answersRef.current = answerMap;
        setSavedAnswers(answerMap);
        setSession(restored);
        const result = await getAssessmentQuestionByIndex(assessmentId, restored.currentQuestionIndex);
        setQuestion(result.question);
        setAnswer(answerMap[result.question.questionId] || '');
      } catch (requestError) {
        setError(requestError);
      }
    };
    void initialize();
    return () => clearTimeout(autosaveRef.current);
  }, [assessmentId, navigate]);

  const persistAnswer = async (questionId, value) => {
    if (!value.trim()) return true;
    if (answersRef.current[questionId] === value) {
      setSaveState('saved');
      return true;
    }
    setSaveState('saving');
    try {
      const result = await saveAssessmentAnswer(assessmentId, questionId, value);
      const nextAnswers = { ...answersRef.current, [questionId]: value };
      answersRef.current = nextAnswers;
      setSavedAnswers(nextAnswers);
      setSession((current) => ({ ...current, answeredCount: result.progress.answeredCount, unansweredCount: result.progress.unansweredCount, progressPercentage: result.progress.progressPercentage }));
      setSaveState('saved');
      setError(null);
      return true;
    } catch (requestError) {
      setSaveState('error');
      setError(requestError);
      return false;
    }
  };

  const chooseOption = async (value) => {
    setAnswer(value);
    await persistAnswer(question.questionId, value);
  };

  const changeShortAnswer = (value) => {
    setAnswer(value);
    setSaveState('unsaved');
    clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => void persistAnswer(question.questionId, value), 800);
  };

  const goTo = async (index) => {
    clearTimeout(autosaveRef.current);
    if (answer.trim() && answersRef.current[question.questionId] !== answer && !(await persistAnswer(question.questionId, answer))) return;
    try {
      await updateCurrentQuestion(assessmentId, index);
      const result = await getAssessmentQuestionByIndex(assessmentId, index);
      setQuestion(result.question);
      setAnswer(answersRef.current[result.question.questionId] || '');
      setSession((current) => ({ ...current, currentQuestionIndex: index }));
      setSaveState('saved');
      setError(null);
    } catch (requestError) {
      setError(requestError);
    }
  };

  const submit = async () => {
    clearTimeout(autosaveRef.current);
    if (answer.trim() && answersRef.current[question.questionId] !== answer && !(await persistAnswer(question.questionId, answer))) return;
    const unanswered = session.questionNavigation.filter((item) => !Object.hasOwn(answersRef.current, item.questionId));
    if (unanswered.length) {
      setError(new Error(`${unanswered.length} question${unanswered.length === 1 ? '' : 's'} still need an answer.`));
      await goTo(unanswered[0].index);
      return;
    }
    if (!window.confirm(`Submit ${session.totalQuestions} answered questions? You cannot change them afterwards.`)) return;
    try {
      await submitAssessment(assessmentId);
      localStorage.removeItem('activeAssessmentId');
      navigate(`/assessments/${assessmentId}/submitted`, { replace: true });
    } catch (requestError) {
      setError(requestError);
    }
  };

  if (error && !session) return <section className="mx-auto max-w-3xl px-6 py-16"><FormError error={error} /></section>;
  if (!session || !question) return <p className="p-16 text-center text-slate-600">Opening your assessment…</p>;
  const index = session.currentQuestionIndex;

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <header className="rounded-xl bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm capitalize text-indigo-600">{session.mode} assessment</p><h1 className="text-2xl font-bold text-slate-950">{session.jobTitle}</h1></div><div className="text-right"><p className="font-semibold">Question {index + 1} of {session.totalQuestions}</p><p className="text-sm text-slate-500">{session.progressPercentage}% answered</p></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-indigo-600 transition-all" style={{ width: `${session.progressPercentage}%` }} /></div></header>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_240px]">
        <main className="rounded-xl bg-white p-6 shadow-sm"><div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide"><span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">{question.section}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{question.difficulty}</span></div><h2 className="mt-5 text-xl font-semibold leading-8 text-slate-950">{question.question}</h2>{question.codeSnippet && <pre className="mt-5 overflow-x-auto rounded-xl bg-slate-950 p-5 text-sm text-slate-100"><code>{question.codeSnippet}</code></pre>}
          {question.type === 'short_answer' ? <label className="mt-6 block"><span className="sr-only">Your answer</span><textarea className="min-h-48 w-full rounded-xl border border-slate-300 p-4" maxLength={5000} placeholder="Write your answer…" value={answer} onChange={(event) => changeShortAnswer(event.target.value)} /><span className="mt-1 block text-right text-xs text-slate-500">{answer.length} / 5,000</span></label> : <div className="mt-6 space-y-3">{question.options.map((option) => <label className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${answer === option ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200'}`} key={option}><input type="radio" name={question.questionId} checked={answer === option} onChange={() => void chooseOption(option)} /><span>{option}</span></label>)}</div>}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3"><button className="rounded-lg border border-slate-300 px-4 py-2 font-semibold disabled:opacity-40" disabled={index === 0} onClick={() => void goTo(index - 1)}>Previous</button><span className={`text-sm ${saveState === 'error' ? 'text-red-600' : 'text-slate-500'}`}>{saveState === 'saving' ? 'Saving…' : saveState === 'unsaved' ? 'Unsaved changes' : saveState === 'error' ? 'Save failed — retry before leaving' : 'Saved'}</span>{index + 1 < session.totalQuestions ? <button className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white" onClick={() => void goTo(index + 1)}>Next</button> : <button className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white" onClick={() => void submit()}>Submit Assessment</button>}</div>
          {error && <div className="mt-5"><FormError error={error} /></div>}
        </main>
        <aside className="rounded-xl bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-950">Questions</h2><div className="mt-4 grid grid-cols-5 gap-2">{session.questionNavigation.map((item) => { const answered = Object.hasOwn(savedAnswers, item.questionId); const current = item.index === index; return <button aria-label={`Question ${item.index + 1}${answered ? ', answered' : ', unanswered'}`} className={`aspect-square rounded-lg text-sm font-semibold ${current ? 'bg-indigo-600 text-white' : answered ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`} key={item.questionId} onClick={() => void goTo(item.index)}>{item.index + 1}</button>; })}</div><div className="mt-5 space-y-2 text-xs text-slate-500"><p><span className="mr-2 inline-block h-2.5 w-2.5 rounded bg-indigo-600" />Current</p><p><span className="mr-2 inline-block h-2.5 w-2.5 rounded bg-emerald-100" />Answered</p><p><span className="mr-2 inline-block h-2.5 w-2.5 rounded bg-slate-100" />Unanswered</p></div><button className="mt-6 w-full rounded-lg border border-emerald-600 px-3 py-2 text-sm font-semibold text-emerald-700" onClick={() => void submit()}>Submit Assessment</button></aside>
      </div>
    </section>
  );
}

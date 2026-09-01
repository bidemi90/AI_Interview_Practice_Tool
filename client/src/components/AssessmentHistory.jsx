import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { assessmentAction } from '../utils/assessmentActions.js';

export default function AssessmentHistory({ assessments, title = 'Assessment History' }) {
  return <section className="rounded-xl bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">{title}</h2><div className="mt-4 space-y-3">{assessments.map((item) => {
    const action = assessmentAction(item);
    return <article className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 p-4" key={item.assessmentId}><div><p className="font-semibold">{item.jobTitle}</p><p className="text-sm capitalize">{item.mode} Assessment</p><p className="mt-1 text-sm capitalize text-slate-600">{item.status.replaceAll('_', ' ')} · {item.answeredQuestionCount} / {item.totalQuestions} answered</p>{item.hasResult && <p className="mt-1 text-sm font-semibold text-indigo-700">{item.overallScore}% · {item.readinessBand}</p>}<p className="mt-1 text-xs text-slate-400">Created {new Date(item.createdAt).toLocaleDateString()}{item.submittedAt ? ` · Completed ${new Date(item.submittedAt).toLocaleDateString()}` : ''}</p></div><Link className="text-sm font-semibold text-indigo-600" to={action.to}>{action.label}</Link></article>;
  })}</div></section>;
}

const summaryShape = PropTypes.shape({ assessmentId: PropTypes.string.isRequired, jobTitle: PropTypes.string.isRequired, mode: PropTypes.string.isRequired, status: PropTypes.string.isRequired, answeredQuestionCount: PropTypes.number.isRequired, totalQuestions: PropTypes.number.isRequired, createdAt: PropTypes.string.isRequired, submittedAt: PropTypes.string, hasResult: PropTypes.bool, overallScore: PropTypes.number, readinessBand: PropTypes.string });
AssessmentHistory.propTypes = { assessments: PropTypes.arrayOf(summaryShape).isRequired, title: PropTypes.string };

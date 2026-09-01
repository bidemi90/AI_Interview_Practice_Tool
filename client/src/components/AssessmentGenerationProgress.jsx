import PropTypes from 'prop-types';

const labels = { completed: '✓ Completed', generating: '⟳ Generating…', retrying: '⟳ Retrying…', failed: '✕ Generation failed', pending: '○ Waiting' };

export default function AssessmentGenerationProgress({ progress, onRetry, retrying }) {
  return <section className="mx-auto max-w-3xl px-6 py-14"><h1 className="text-3xl font-bold">Preparing your assessment</h1>
    <div className="mt-7 flex justify-between"><strong>{progress.completedSections} of {progress.totalSections} sections completed</strong><strong>{progress.progressPercentage}%</strong></div>
    <div className="mt-3 h-2 bg-slate-200"><div className="h-full bg-indigo-600" style={{ width: `${progress.progressPercentage}%` }} /></div>
    <ul className="mt-8 space-y-3">{progress.sections.map((section) => <Section key={section.name} section={section} onRetry={onRetry} retrying={retrying} />)}</ul>
  </section>;
}

function Section({ section, onRetry, retrying }) {
  const active = ['generating', 'retrying'].includes(section.status);
  return <li className="rounded-xl bg-white p-4 shadow-sm"><div className="flex justify-between"><strong>{section.name}</strong><span className={active ? 'animate-pulse text-indigo-600' : ''}>{labels[section.status]}</span></div>
    <p className="mt-1 text-sm text-slate-600">{section.status === 'completed' ? section.generatedQuestionCount : section.questionCount} questions{active || section.status === 'failed' ? ` · Attempt ${section.attempts} of 5` : ''}</p>
    {section.status === 'failed' && <button className="mt-3 rounded bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={Boolean(retrying)} onClick={() => onRetry(section.name)}>{retrying === section.name ? 'Starting retry…' : 'Retry failed section'}</button>}
  </li>;
}

const sectionShape = PropTypes.shape({
  name: PropTypes.string.isRequired, status: PropTypes.string.isRequired,
  attempts: PropTypes.number.isRequired, questionCount: PropTypes.number.isRequired,
  generatedQuestionCount: PropTypes.number.isRequired,
});

AssessmentGenerationProgress.propTypes = {
  progress: PropTypes.shape({
    completedSections: PropTypes.number.isRequired, totalSections: PropTypes.number.isRequired,
    progressPercentage: PropTypes.number.isRequired, sections: PropTypes.arrayOf(sectionShape).isRequired,
  }).isRequired,
  onRetry: PropTypes.func.isRequired,
  retrying: PropTypes.string,
};
Section.propTypes = { section: sectionShape.isRequired, onRetry: PropTypes.func.isRequired, retrying: PropTypes.string };

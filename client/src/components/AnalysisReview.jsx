import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

function ListSection({ title, items }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {items.length ? <ul className="mt-3 grid gap-2 sm:grid-cols-2">{items.map((item) => <li className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700" key={item}>{item}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">None identified.</p>}
    </section>
  );
}

ListSection.propTypes = { title: PropTypes.string.isRequired, items: PropTypes.arrayOf(PropTypes.string).isRequired };

export default function AnalysisReview({ jobProfile }) {
  const { analysis } = jobProfile;
  const general = analysis.recommendedSections.filter((section) => section.category === 'general');
  const specific = analysis.recommendedSections.filter((section) => section.category === 'job_specific');
  const sectionGroup = (title, sections) => (
    <section>
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{sections.map((section) => (
        <article className="rounded-xl border border-slate-200 p-4" key={`${section.category}-${section.name}`}>
          <div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{section.name}</h3><span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium capitalize text-indigo-700">{section.priority}</span></div>
          <p className="mt-2 text-sm text-slate-600">{section.description}</p>
          <p className="mt-3 text-xs text-slate-500">{section.suggestedQuestionTypes.join(' · ')}</p>
        </article>
      ))}</div>
    </section>
  );

  return (
    <div className="space-y-10">
      <header><p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Analysis complete</p><h1 className="mt-2 text-4xl font-bold text-slate-950">{analysis.jobTitle}</h1></header>
      <ListSection title="Main responsibilities" items={analysis.mainResponsibilities} />
      <ListSection title="Required skills" items={analysis.requiredSkills} />
      <ListSection title="Technical skills" items={analysis.technicalSkills} />
      <ListSection title="Soft skills" items={analysis.softSkills} />
      <ListSection title="Experience areas" items={analysis.experienceAreas} />
      <ListSection title="Likely interview topics" items={analysis.likelyInterviewTopics} />
      {sectionGroup('General Interview Sections', general)}
      {sectionGroup('Job-Specific Interview Sections', specific)}
      <Link className="inline-block rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white" to={`/jobs/${jobProfile._id}/assessment-setup`}>Continue to Assessment Setup</Link>
    </div>
  );
}

AnalysisReview.propTypes = { jobProfile: PropTypes.object.isRequired };

const modeSettings = {
  quick: { total: 15, general: 5, difficulty: { easy: 0.4, medium: 0.5, hard: 0.1 } },
  standard: { total: 30, general: 10, difficulty: { easy: 0.3, medium: 0.5, hard: 0.2 } },
  full: { total: 48, general: 16, difficulty: { easy: 0.25, medium: 0.5, hard: 0.25 } },
};

const priorityWeight = { low: 1, medium: 2, high: 3 };
const programmingPattern = /software|developer|engineer|programmer|frontend|backend|full[ -]?stack|web development/i;

function allocateByWeight(total, entries, weightFor) {
  if (!entries.length) return [];
  const selected = [...entries]
    .sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority])
    .slice(0, total);
  const allocations = selected.map((entry) => ({ entry, count: 1 }));
  let remaining = total - allocations.length;
  const cap = selected.length === 1 ? total : selected.length === 2 ? Math.ceil(total * 0.6) : Math.ceil(total * 0.4);
  while (remaining > 0) {
    const candidates = allocations.filter((item) => item.count < cap);
    const pool = candidates.length ? candidates : allocations;
    pool.sort((a, b) => (weightFor(b.entry) / b.count) - (weightFor(a.entry) / a.count));
    pool[0].count += 1;
    remaining -= 1;
  }
  return allocations;
}

function integerDistribution(total, weights) {
  const entries = Object.entries(weights).filter(([, weight]) => weight > 0);
  const weightTotal = entries.reduce((sum, [, weight]) => sum + weight, 0);
  const result = Object.fromEntries(entries.map(([key, weight]) => [key, Math.floor((total * weight) / weightTotal)]));
  let remaining = total - Object.values(result).reduce((sum, value) => sum + value, 0);
  const remainders = entries.map(([key, weight], index) => ({ key, index, remainder: ((total * weight) / weightTotal) % 1 }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let index = 0; index < remaining; index += 1) result[remainders[index % remainders.length].key] += 1;
  return result;
}

function smoothSequence(distribution) {
  const keys = Object.keys(distribution);
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
  const remaining = { ...distribution };
  const current = Object.fromEntries(keys.map((key) => [key, 0]));
  const sequence = [];
  for (let position = 0; position < total; position += 1) {
    for (const key of keys) current[key] += remaining[key] > 0 ? distribution[key] : 0;
    const chosen = keys.filter((key) => remaining[key] > 0).sort((a, b) => current[b] - current[a])[0];
    sequence.push(chosen);
    current[chosen] -= total;
    remaining[chosen] -= 1;
  }
  return sequence;
}

function isProgrammingRole(analysis) {
  const searchable = [analysis.jobTitle, ...analysis.technicalSkills, ...analysis.experienceAreas].join(' ');
  return programmingPattern.test(searchable);
}

function typeDistribution(count, section, programmingRole, mode) {
  const suggested = new Set(section.suggestedQuestionTypes);
  const allowed = ['multiple_choice', 'scenario', 'code', 'code_correction', 'short_answer']
    .filter((type) => suggested.has(type))
    .filter((type) => programmingRole || !['code', 'code_correction'].includes(type))
    .filter((type) => section.category === 'job_specific' || !['code', 'code_correction'].includes(type))
    .filter((type) => mode !== 'quick' || type !== 'short_answer');
  if (!allowed.length) allowed.push('multiple_choice');
  const weights = { multiple_choice: 0.66, scenario: 0.24, code: 0.05, code_correction: 0.03, short_answer: 0.02 };
  const practicalType = programmingRole && section.category === 'job_specific' && count >= 2
    ? ['code', 'code_correction'].find((type) => allowed.includes(type))
    : null;
  const distribution = integerDistribution(count - (practicalType ? 1 : 0), Object.fromEntries(allowed.map((type) => [type, weights[type]])));
  if (practicalType) distribution[practicalType] = (distribution[practicalType] || 0) + 1;
  return distribution;
}

export function createAssessmentBlueprint(jobAnalysis, mode) {
  const settings = modeSettings[mode];
  if (!settings) throw new Error(`Unsupported assessment mode: ${mode}`);
  const general = jobAnalysis.recommendedSections.filter((section) => section.category === 'general');
  const specific = jobAnalysis.recommendedSections.filter((section) => section.category === 'job_specific');
  let generalTotal = settings.general;
  if (!general.length) generalTotal = 0;
  if (!specific.length) generalTotal = settings.total;
  const specificTotal = settings.total - generalTotal;
  const allocations = [
    ...allocateByWeight(generalTotal, general, (section) => priorityWeight[section.priority]),
    ...allocateByWeight(specificTotal, specific, (section) => priorityWeight[section.priority]),
  ];
  const difficultyTotals = integerDistribution(settings.total, settings.difficulty);
  const difficultySequence = smoothSequence(difficultyTotals);
  const programmingRole = isProgrammingRole(jobAnalysis);
  let offset = 0;
  return allocations.map(({ entry, count }) => {
    const slice = difficultySequence.slice(offset, offset + count);
    offset += count;
    return {
      section: entry.name,
      category: entry.category,
      questionCount: count,
      difficultyDistribution: Object.fromEntries(['easy', 'medium', 'hard'].map((level) => [level, slice.filter((item) => item === level).length])),
      questionTypeDistribution: typeDistribution(count, entry, programmingRole, mode),
    };
  });
}

export function getModeQuestionCount(mode) {
  return modeSettings[mode]?.total;
}

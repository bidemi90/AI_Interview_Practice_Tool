const round = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export function normalizeSectionName(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function proficiencyScore(earned, available) {
  return available > 0 ? round((earned / available) * 100) : 0;
}

export function weaknessWeight(proficiency) {
  const safe = Number.isFinite(Number(proficiency)) ? Math.min(100, Math.max(0, Number(proficiency))) : 100;
  return round(Math.min(2, Math.max(1, 1 + ((100 - safe) / 100))));
}

export function effectiveWeaknessWeight(proficiency, attempts) {
  if (!attempts) return 1;
  const evidence = attempts === 1 ? 0.25 : attempts === 2 ? 0.5 : 1;
  return round(1 + ((weaknessWeight(proficiency) - 1) * evidence));
}

export function performanceTrend(scores, threshold = 5) {
  if (!scores || scores.length < 2) return 'stable';
  const latest = scores.at(-1).percentage;
  const previous = scores.slice(0, -1);
  const average = previous.reduce((sum, item) => sum + item.percentage, 0) / previous.length;
  if (latest - average >= threshold) return 'improving';
  if (average - latest >= threshold) return 'declining';
  return 'stable';
}

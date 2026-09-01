export const STRONG_AREA_THRESHOLD = 75;
export const WEAK_AREA_THRESHOLD = 60;

export function readinessBand(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Strong';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Developing';
  return 'Needs Improvement';
}

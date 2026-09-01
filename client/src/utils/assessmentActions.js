export function assessmentAction(item) {
  if (item.status === 'in_progress') return { label: 'Continue Assessment', to: `/assessments/${item.assessmentId}/take` };
  if (item.status === 'ready') return { label: 'Start Assessment', to: `/assessments/${item.assessmentId}/take` };
  if (item.status === 'submitted') return item.hasResult
    ? { label: 'View Results', to: `/assessments/${item.assessmentId}/results` }
    : { label: 'Process Results', to: `/assessments/${item.assessmentId}/submitted` };
  if (item.status === 'generation_failed') return { label: 'Retry Failed Generation', to: `/assessments/${item.assessmentId}` };
  return { label: 'View Generation', to: `/assessments/${item.assessmentId}` };
}

import { jobAnalysisOutputSchema } from '../../validators/jobSchemas.js';

function removeCodeFence(content) {
  return content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

export function parseJobAnalysis(content) {
  if (typeof content !== 'string' || !content.trim()) return { success: false };
  try {
    const result = jobAnalysisOutputSchema.safeParse(JSON.parse(removeCodeFence(content)));
    return result.success ? { success: true, data: result.data } : { success: false };
  } catch {
    return { success: false };
  }
}

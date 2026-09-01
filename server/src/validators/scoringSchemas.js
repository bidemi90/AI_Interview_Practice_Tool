import { z } from 'zod';

export const shortAnswerGradeSchema = z.object({
  awardedPoints: z.number().finite(), maxPoints: z.number().positive(),
  isAcceptable: z.boolean(), reason: z.string().trim().min(5).max(1_000),
}).strict();

export const feedbackSchema = z.object({
  summary: z.string().trim().min(10).max(2_000),
  strengths: z.array(z.string().trim().min(3).max(500)).max(10),
  weaknesses: z.array(z.string().trim().min(3).max(500)).max(10),
  topicsToRevise: z.array(z.string().trim().min(2).max(500)).max(15),
  recommendedNextSteps: z.array(z.string().trim().min(3).max(500)).max(15),
}).strict();

export function parseStructuredContent(content, schema) {
  if (typeof content !== 'string' || !content.trim()) return { success: false };
  try {
    const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return schema.safeParse(JSON.parse(cleaned));
  } catch {
    return { success: false };
  }
}

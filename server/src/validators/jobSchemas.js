import { z } from 'zod';
import { predefinedRoleMap } from '../config/predefinedRoles.js';

const questionType = z.enum(['multiple_choice', 'scenario', 'code', 'code_correction', 'short_answer']);
const stringList = z.array(z.string().trim().min(1).max(200)).max(50);

export const jobAnalysisOutputSchema = z.object({
  jobTitle: z.string().trim().min(1).max(150),
  mainResponsibilities: stringList,
  requiredSkills: stringList,
  technicalSkills: stringList,
  softSkills: stringList,
  experienceAreas: stringList,
  likelyInterviewTopics: stringList,
  recommendedSections: z.array(z.object({
    name: z.string().trim().min(1).max(100),
    category: z.enum(['general', 'job_specific']),
    description: z.string().trim().min(1).max(500),
    priority: z.enum(['low', 'medium', 'high']),
    suggestedQuestionTypes: z.array(questionType).min(1).max(5),
  }).strict()).min(1).max(30),
}).strict();

export const analyzeJobSchema = z.object({
  jobDescription: z.string().trim().min(80, 'Job description must contain at least 80 characters.').max(15_000).optional(),
  predefinedRoleKey: z.string().trim().optional(),
}).strict().superRefine((data, context) => {
  const sourceCount = Number(Boolean(data.jobDescription)) + Number(Boolean(data.predefinedRoleKey));
  if (sourceCount !== 1) {
    context.addIssue({ code: 'custom', message: 'Provide exactly one job source.', path: [] });
  }
  if (data.predefinedRoleKey && !predefinedRoleMap.has(data.predefinedRoleKey)) {
    context.addIssue({ code: 'custom', message: 'Select a valid predefined role.', path: ['predefinedRoleKey'] });
  }
});

export const jobListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
}).strict();

import { z } from 'zod';

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  targetRoles: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  experienceLevel: z.enum(['entry', 'mid', 'senior', 'lead', 'executive']).nullable().optional(),
  yearsOfExperience: z.number().min(0).max(60).nullable().optional(),
  preferredJobTitle: z.string().trim().max(100).nullable().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update.');

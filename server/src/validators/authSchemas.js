import { z } from 'zod';

const email = z.string().trim().email('Enter a valid email address.').max(254).transform((value) => value.toLowerCase());
const password = z.string().min(8, 'Password must contain at least 8 characters.').max(128);

export const registrationSchema = z.object({
  name: z.string().trim().min(2, 'Name must contain at least 2 characters.').max(100),
  email,
  password,
}).strict();

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required.').max(128),
}).strict();

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.').max(128),
  newPassword: password,
}).strict().refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from the current password.',
  path: ['newPassword'],
});

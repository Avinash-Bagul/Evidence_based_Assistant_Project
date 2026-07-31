import { z } from 'zod';

export const generatePlanSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid project ID'),
  }),
});

export const getPlanSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid project ID'),
  }),
});

export const reviewPlanSchema = z.object({
  params: z.object({
    planId: z.string().uuid('Invalid plan ID'),
  }),
  body: z.object({
    action: z.enum(['APPROVE', 'REJECT'], {
      error: 'Action must be APPROVE or REJECT',
    }),
    comment: z.string().max(2000).optional(),
  }),
});

export type ReviewPlanInput = z.infer<typeof reviewPlanSchema>['body'];

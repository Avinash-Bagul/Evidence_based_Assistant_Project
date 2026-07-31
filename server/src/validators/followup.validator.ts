import { z } from 'zod';

export const followUpSchema = z.object({
  params: z.object({
    briefId: z.string().uuid('Invalid brief ID'),
  }),
  body: z.object({
    question: z.string().min(5, 'Follow-up question must be at least 5 characters').max(2000),
  }),
});

export type FollowUpInput = z.infer<typeof followUpSchema>['body'];

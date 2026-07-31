import { z } from 'zod';

export const generateBriefSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid project ID'),
  }),
});

export const getBriefSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid project ID'),
  }),
});

export const reviewBriefSchema = z.object({
  params: z.object({
    briefId: z.string().uuid('Invalid brief ID'),
  }),
  body: z.object({
    action: z.enum(['APPROVE', 'REJECT'], {
      error: 'Action must be APPROVE or REJECT',
    }),
    comment: z.string().max(2000).optional(),
  }),
});

export const updateClaimSchema = z.object({
  params: z.object({
    briefId: z.string().uuid('Invalid brief ID'),
    claimId: z.string().uuid('Invalid claim ID'),
  }),
  body: z.object({
    status: z.enum(['ACCEPTED', 'REJECTED', 'EDITED'], {
      error: 'Status must be ACCEPTED, REJECTED, or EDITED',
    }),
    content: z.string().min(1).optional(),
  }),
});

export type ReviewBriefInput = z.infer<typeof reviewBriefSchema>['body'];
export type UpdateClaimInput = z.infer<typeof updateClaimSchema>['body'];

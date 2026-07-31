import { z } from 'zod';

export const retrieveEvidenceSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid project ID'),
  }),
});

export const evidenceListSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid project ID'),
  }),
});

export const evidenceIdParamSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid project ID'),
    evidenceId: z.string().uuid('Invalid evidence ID'),
  }),
});

import { z } from 'zod';

export const documentProjectParamSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid project ID'),
  }),
});

export const documentIdParamSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid project ID'),
    docId: z.string().uuid('Invalid document ID'),
  }),
});

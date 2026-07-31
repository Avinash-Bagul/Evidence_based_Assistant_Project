import { z } from 'zod';

export const versionListSchema = z.object({
  params: z.object({
    briefId: z.string().uuid('Invalid brief ID'),
  }),
});

export const versionIdParamSchema = z.object({
  params: z.object({
    briefId: z.string().uuid('Invalid brief ID'),
    versionId: z.string().uuid('Invalid version ID'),
  }),
});

import { z } from 'zod';

export const createProjectSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(500),
    description: z.string().max(5000).optional().default(''),
    researchQuestion: z.string().max(2000).optional(),
  }),
});

export const updateProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
  }),
  body: z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    researchQuestion: z.string().max(2000).optional().nullable(),
    status: z
      .enum([
        'CREATED',
        'DOCUMENTS_UPLOADED',
        'PLAN_GENERATED',
        'PLAN_APPROVED',
        'EVIDENCE_RETRIEVED',
        'BRIEF_GENERATED',
        'BRIEF_APPROVED',
        'COMPLETED',
      ])
      .optional(),
  }),
});

export const projectIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
  }),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>['body'];
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>['body'];

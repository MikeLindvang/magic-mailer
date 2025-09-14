import { z } from 'zod';

/**
 * Draft Schema
 * 
 * Represents a generated email draft with multiple format outputs,
 * contextual information, and optional scoring metrics.
 */
export const zDraft = z.object({
  _id: z.string().min(1, 'Draft ID is required'),
  projectId: z.string().min(1, 'Project ID is required'),
  angle: z.string().min(1, 'Angle is required'),
  subject: z.string().min(1, 'Subject is required'),
  preheader: z.string().optional(),
  formats: z.object({
    html: z.string().min(1, 'HTML format is required'),
    md: z.string().min(1, 'Markdown format is required'),
    txt: z.string().min(1, 'Text format is required'),
  }),
  context_chunk_ids: z.array(z.string()).default([]),
  scores: z.any().optional(), // Flexible object for scoring metrics
  createdAt: z.date().default(() => new Date()),
});

export type Draft = z.infer<typeof zDraft>;

/**
 * Schema for creating a new draft (without auto-generated fields)
 */
export const zCreateDraft = zDraft.omit({
  _id: true,
  createdAt: true,
});

export type CreateDraft = z.infer<typeof zCreateDraft>;

/**
 * Schema for updating an existing draft (all fields optional except ID)
 */
export const zUpdateDraft = zDraft.partial().required({
  _id: true,
});

export type UpdateDraft = z.infer<typeof zUpdateDraft>;

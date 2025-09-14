import { z } from 'zod';

/**
 * Asset Schema
 * Represents a document/file asset within a project
 */
export const zAsset = z.object({
  _id: z.string(),
  projectId: z.string(),
  type: z.enum(['pdf', 'html', 'docx', 'md']),
  title: z.string().min(1, 'Title is required'),
  sourceUrl: z.string().url().optional(),
  filePath: z.string().optional(),
  parsed_md: z.string().optional(),
  hash: z.string(),
  createdAt: z.date(),
});

export type Asset = z.infer<typeof zAsset>;

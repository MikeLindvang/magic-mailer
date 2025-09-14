import { z } from 'zod';

/**
 * Chunk schema for document processing and vector storage
 * 
 * Represents a processed chunk of content from an asset with metadata
 * and optional vector embeddings for semantic search.
 */
export const zChunk = z.object({
  _id: z.string().min(1, 'Chunk ID is required'),
  projectId: z.string().min(1, 'Project ID is required'),
  assetId: z.string().min(1, 'Asset ID is required'),
  chunkId: z.string().min(1, 'Chunk ID is required'),
  userId: z.string().min(1, 'User ID is required').optional(), // Optional for backward compatibility
  md_text: z.string().min(1, 'Markdown text is required'),
  tokens: z.number().int().positive('Token count must be positive'),
  section: z.string().optional(),
  meta: z.object({
    hpath: z.array(z.string()).default([]),
  }).optional(),
  vector: z.boolean().optional(),
  embedding: z.array(z.number()).optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().optional(),
});

export type Chunk = z.infer<typeof zChunk>;

/**
 * Schema for creating a new chunk (without auto-generated fields)
 */
export const zCreateChunk = zChunk.omit({
  _id: true,
  createdAt: true,
});

export type CreateChunk = z.infer<typeof zCreateChunk>;

/**
 * Schema for updating an existing chunk (all fields optional except ID)
 */
export const zUpdateChunk = zChunk.partial().required({
  _id: true,
});

export type UpdateChunk = z.infer<typeof zUpdateChunk>;

import { z } from 'zod';

/**
 * Style Profile Schema
 * 
 * Represents a user's writing style profile with style characteristics
 * and training sources for AI-powered content generation.
 */
export const zStyleProfile = z.object({
  _id: z.string().min(1, 'Style Profile ID is required'),
  ownerId: z.string().min(1, 'Owner ID is required'),
  style_card: z.any(), // Flexible object for style characteristics
  sources: z.array(z.string()).default([]),
  createdAt: z.date().default(() => new Date()),
});

export type StyleProfile = z.infer<typeof zStyleProfile>;

/**
 * Schema for creating a new style profile (without auto-generated fields)
 */
export const zCreateStyleProfile = zStyleProfile.omit({
  _id: true,
  createdAt: true,
});

export type CreateStyleProfile = z.infer<typeof zCreateStyleProfile>;

/**
 * Schema for updating an existing style profile (all fields optional except ID)
 */
export const zUpdateStyleProfile = zStyleProfile.partial().required({
  _id: true,
});

export type UpdateStyleProfile = z.infer<typeof zUpdateStyleProfile>;

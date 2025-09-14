import { z } from 'zod';

/**
 * Zod schema for Project validation
 */
export const zProject = z.object({
  _id: z.string(),
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
  userId: z.string().min(1, 'User ID is required'),
  default_link: z.string().url('Must be a valid URL').optional(),
  style_profile_id: z.string().optional(),
  createdAt: z.string(), // ISO string format
  updatedAt: z.string(), // ISO string format
});

/**
 * TypeScript type derived from Zod schema
 */
export type Project = z.infer<typeof zProject>;

/**
 * Schema for creating a new project (without _id, createdAt, updatedAt)
 */
export const zCreateProject = zProject.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * TypeScript type for creating a new project
 */
export type CreateProject = z.infer<typeof zCreateProject>;

/**
 * Schema for updating a project (all fields optional except _id)
 */
export const zUpdateProject = zProject.partial().required({ _id: true });

/**
 * TypeScript type for updating a project
 */
export type UpdateProject = z.infer<typeof zUpdateProject>;

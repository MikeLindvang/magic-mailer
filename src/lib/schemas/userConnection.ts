import { z } from 'zod';

/**
 * User Connection Schema
 * 
 * Represents a user's connection to external services (e.g., email providers)
 * with authentication credentials and metadata.
 */
export const zUserConnection = z.object({
  _id: z.string().min(1, 'User Connection ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  provider: z.literal('getresponse'), // Currently only GetResponse supported
  authType: z.literal('apiKey'), // Currently only API key authentication
  data: z.object({
    masked: z.string().min(1, 'Masked credential is required'),
    last4: z.string().length(4, 'Last 4 characters must be exactly 4 characters'),
    encrypted: z.string().min(1, 'Encrypted credential is required'),
  }),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type UserConnection = z.infer<typeof zUserConnection>;

/**
 * Schema for creating a new user connection (without auto-generated fields)
 */
export const zCreateUserConnection = zUserConnection.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateUserConnection = z.infer<typeof zCreateUserConnection>;

/**
 * Schema for updating an existing user connection (all fields optional except ID)
 */
export const zUpdateUserConnection = zUserConnection.partial().required({
  _id: true,
}).extend({
  updatedAt: z.date().default(() => new Date()),
});

export type UpdateUserConnection = z.infer<typeof zUpdateUserConnection>;

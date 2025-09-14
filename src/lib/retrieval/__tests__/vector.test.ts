import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { vectorSearch, getEmbeddingStats } from '../vector';
import { getColl } from '@/lib/db/mongo';

// Mock the database
jest.mock('@/lib/db/mongo');
const mockGetColl = getColl as jest.MockedFunction<typeof getColl>;

describe('Vector Search', () => {
  const mockChunks = {
    find: jest.fn(),
    countDocuments: jest.fn(),
    findOne: jest.fn(),
    aggregate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetColl.mockResolvedValue(mockChunks as any);
  });

  describe('vectorSearch', () => {
    it('should return empty array when no chunks with embeddings exist', async () => {
      mockChunks.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      });

      const result = await vectorSearch('project-123', [0.1, 0.2, 0.3], 5);
      
      expect(result).toEqual([]);
    });

    it('should calculate cosine similarity correctly and return top-k results', async () => {
      const queryVec = [1, 0, 0]; // Unit vector along x-axis
      
      const mockChunkData = [
        {
          chunkId: 'chunk-1',
          md_text: 'First chunk text',
          meta: { hpath: ['section1'] },
          embedding: [1, 0, 0], // Perfect match
        },
        {
          chunkId: 'chunk-2', 
          md_text: 'Second chunk text',
          meta: { hpath: ['section2'] },
          embedding: [0, 1, 0], // Orthogonal (no similarity)
        },
        {
          chunkId: 'chunk-3',
          md_text: 'Third chunk text', 
          meta: { hpath: ['section3'] },
          embedding: [0.7, 0.7, 0], // Some similarity
        }
      ];

      mockChunks.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockChunkData)
      });

      const result = await vectorSearch('project-123', queryVec, 2);
      
      expect(result).toHaveLength(2);
      expect(result[0].chunkId).toBe('chunk-1');
      expect(result[0].score).toBeCloseTo(1.0, 5); // Perfect similarity
      expect(result[1].chunkId).toBe('chunk-3');
      expect(result[1].score).toBeCloseTo(0.7, 1); // Partial similarity
    });

    it('should throw error for invalid inputs', async () => {
      await expect(vectorSearch('', [1, 2, 3], 5))
        .rejects.toThrow('Project ID is required');
      
      await expect(vectorSearch('project-123', [], 5))
        .rejects.toThrow('Query vector is required and must not be empty');
      
      await expect(vectorSearch('project-123', [1, 2, 3], 0))
        .rejects.toThrow('k must be a positive integer');
    });

    it('should handle chunks with mismatched embedding dimensions', async () => {
      const queryVec = [1, 0, 0];
      
      const mockChunkData = [
        {
          chunkId: 'chunk-1',
          md_text: 'Valid chunk',
          meta: { hpath: [] },
          embedding: [1, 0, 0], // Correct dimensions
        },
        {
          chunkId: 'chunk-2',
          md_text: 'Invalid chunk',
          meta: { hpath: [] },
          embedding: [1, 0], // Wrong dimensions - should be skipped
        }
      ];

      mockChunks.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockChunkData)
      });

      const result = await vectorSearch('project-123', queryVec, 5);
      
      expect(result).toHaveLength(1);
      expect(result[0].chunkId).toBe('chunk-1');
    });
  });

  describe('getEmbeddingStats', () => {
    it('should return correct embedding statistics', async () => {
      mockChunks.countDocuments
        .mockResolvedValueOnce(100) // total chunks
        .mockResolvedValueOnce(75); // chunks with embeddings

      mockChunks.findOne.mockResolvedValue({
        embedding: new Array(1536).fill(0) // OpenAI text-embedding-3-small dimensions
      });

      mockChunks.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([{ avgLength: 250.5 }])
      });

      const stats = await getEmbeddingStats('project-123');
      
      expect(stats).toEqual({
        totalChunks: 100,
        chunksWithEmbeddings: 75,
        embeddingDimensions: 1536,
        averageTextLength: 251,
      });
    });
  });
});

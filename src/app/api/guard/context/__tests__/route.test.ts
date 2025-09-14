import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock Clerk auth
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
}));

// Mock OpenAI API
global.fetch = jest.fn();

const mockAuth = jest.requireMock('@clerk/nextjs/server').auth;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('/api/guard/context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'test-user-id' });
  });

  const createRequest = (body: Record<string, unknown>) => {
    return new NextRequest('http://localhost:3000/api/guard/context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  const mockOpenAIResponse = (content: Record<string, unknown>) => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify(content)
            }
          }
        ]
      }),
    } as Response);
  };

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockAuth.mockResolvedValueOnce({ userId: null });

      const request = createRequest({
        contextChunks: [{ chunkId: 'chunk1', md_text: 'Test content' }],
        draft: { md: 'Test draft' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.ok).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Request Validation', () => {
    it('should return 400 for missing contextChunks', async () => {
      const request = createRequest({
        draft: { md: 'Test draft' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('Validation error');
    });

    it('should return 400 for empty contextChunks array', async () => {
      const request = createRequest({
        contextChunks: [],
        draft: { md: 'Test draft' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('At least one context chunk is required');
    });

    it('should return 400 for missing draft content', async () => {
      const request = createRequest({
        contextChunks: [{ chunkId: 'chunk1', md_text: 'Test content' }],
        draft: {}
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('Either html or md content is required');
    });

    it('should accept valid request with md content', async () => {
      mockOpenAIResponse({
        claims: [
          {
            claim: 'Test claim',
            status: 'supported',
            supporting_chunks: ['chunk1'],
            evidence: 'Test evidence',
            confidence: 0.9
          }
        ],
        summary: {
          total_claims: 1,
          supported_claims: 1,
          unsupported_claims: 0,
          support_percentage: 100
        },
        recommendations: ['Test recommendation']
      });

      const request = createRequest({
        contextChunks: [{ chunkId: 'chunk1', md_text: 'Test content supports the claim' }],
        draft: { md: 'Test claim in draft' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.claims).toHaveLength(1);
      expect(data.data.summary.total_claims).toBe(1);
    });

    it('should accept valid request with html content', async () => {
      mockOpenAIResponse({
        claims: [],
        summary: {
          total_claims: 0,
          supported_claims: 0,
          unsupported_claims: 0,
          support_percentage: 0
        },
        recommendations: []
      });

      const request = createRequest({
        contextChunks: [{ chunkId: 'chunk1', md_text: 'Test content' }],
        draft: { html: '<p>Test claim in HTML</p>' }
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('Context Validation', () => {
    it('should validate supported claims correctly', async () => {
      const mockValidation = {
        claims: [
          {
            claim: 'The product increased sales by 25%',
            status: 'supported',
            supporting_chunks: ['chunk1', 'chunk2'],
            evidence: 'Both chunks mention the 25% sales increase with supporting data',
            confidence: 0.95
          },
          {
            claim: 'Users love the new feature',
            status: 'unsupported',
            supporting_chunks: [],
            evidence: 'No specific user feedback data found in context chunks',
            confidence: 0.8
          }
        ],
        summary: {
          total_claims: 2,
          supported_claims: 1,
          unsupported_claims: 1,
          support_percentage: 50
        },
        recommendations: [
          'Add specific user testimonials to support the user satisfaction claim',
          'Consider citing the specific data sources for the sales increase'
        ]
      };

      mockOpenAIResponse(mockValidation);

      const request = createRequest({
        contextChunks: [
          { 
            chunkId: 'chunk1', 
            md_text: 'Q3 sales data shows a 25% increase over Q2, driven by new product features.' 
          },
          { 
            chunkId: 'chunk2', 
            md_text: 'The sales team reported consistent 25% growth across all regions.' 
          }
        ],
        draft: { 
          md: 'Our product increased sales by 25% and users love the new feature!' 
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.data.claims).toHaveLength(2);
      expect(data.data.claims[0].status).toBe('supported');
      expect(data.data.claims[0].supporting_chunks).toEqual(['chunk1', 'chunk2']);
      expect(data.data.claims[1].status).toBe('unsupported');
      expect(data.data.summary.support_percentage).toBe(50);
      expect(data.data.recommendations).toHaveLength(2);
    });

    it('should handle confidence scores correctly', async () => {
      mockOpenAIResponse({
        claims: [
          {
            claim: 'Test claim',
            status: 'supported',
            supporting_chunks: ['chunk1'],
            evidence: 'Test evidence',
            confidence: 1.5 // Invalid high confidence
          },
          {
            claim: 'Another claim',
            status: 'supported',
            supporting_chunks: ['chunk1'],
            evidence: 'Test evidence',
            confidence: -0.5 // Invalid low confidence
          }
        ],
        summary: {
          total_claims: 2,
          supported_claims: 2,
          unsupported_claims: 0,
          support_percentage: 100
        },
        recommendations: []
      });

      const request = createRequest({
        contextChunks: [{ chunkId: 'chunk1', md_text: 'Test content' }],
        draft: { md: 'Test claims' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.claims[0].confidence).toBe(1.0); // Clamped to max
      expect(data.data.claims[1].confidence).toBe(0.0); // Clamped to min
    });
  });

  describe('Error Handling', () => {
    it('should handle OpenAI API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const request = createRequest({
        contextChunks: [{ chunkId: 'chunk1', md_text: 'Test content' }],
        draft: { md: 'Test draft' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('Failed to validate context');
    });

    it('should handle invalid JSON response from OpenAI', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'Invalid JSON response'
              }
            }
          ]
        }),
      } as Response);

      const request = createRequest({
        contextChunks: [{ chunkId: 'chunk1', md_text: 'Test content' }],
        draft: { md: 'Test draft' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('Failed to validate context');
    });

    it('should handle missing claims in LLM response', async () => {
      mockOpenAIResponse({
        summary: {
          total_claims: 0,
          supported_claims: 0,
          unsupported_claims: 0,
          support_percentage: 0
        },
        recommendations: []
      });

      const request = createRequest({
        contextChunks: [{ chunkId: 'chunk1', md_text: 'Test content' }],
        draft: { md: 'Test draft' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.ok).toBe(false);
      expect(data.error).toContain('Invalid response format from LLM: missing claims array');
    });
  });
});

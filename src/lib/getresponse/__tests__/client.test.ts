import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GetResponseClient, zNewsletterDraftRequest } from '../client';

// Mock fetch globally
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('GetResponseClient', () => {
  let client: GetResponseClient;
  const mockApiKey = 'test-api-key-12345';

  beforeEach(() => {
    client = new GetResponseClient({ apiKey: mockApiKey });
    mockFetch.mockClear();
  });

  describe('createNewsletterDraft', () => {
    const validRequest = {
      campaignId: 'campaign123',
      fromFieldId: 'fromfield456',
      subject: 'Test Newsletter Subject',
      preheader: 'Test preheader text',
      html: '<h1>Test HTML Content</h1><p>This is a test newsletter.</p>',
      plain: 'Test HTML Content\n\nThis is a test newsletter.',
    };

    it('should validate input using Zod schema', () => {
      // Valid input should pass
      expect(() => zNewsletterDraftRequest.parse(validRequest)).not.toThrow();

      // Invalid input should fail
      expect(() => zNewsletterDraftRequest.parse({
        ...validRequest,
        campaignId: '', // Empty campaign ID should fail
      })).toThrow();

      expect(() => zNewsletterDraftRequest.parse({
        ...validRequest,
        subject: '', // Empty subject should fail
      })).toThrow();

      expect(() => zNewsletterDraftRequest.parse({
        ...validRequest,
        html: '', // Empty HTML should fail
      })).toThrow();
    });

    it('should create newsletter draft successfully', async () => {
      const mockResponse = {
        newsletterId: 'newsletter789',
        href: 'https://api.getresponse.com/v3/newsletters/newsletter789',
        name: 'Draft - Test Newsletter Subject',
        type: 'newsletter',
        status: 'draft',
        editor: 'custom',
        subject: 'Test Newsletter Subject',
        campaign: {
          campaignId: 'campaign123',
          href: 'https://api.getresponse.com/v3/campaigns/campaign123',
          name: 'Test Campaign',
        },
        sendOn: null,
        createdOn: '2024-01-15T10:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await client.createNewsletterDraft(validRequest);

      expect(result).toEqual({
        newsletterId: 'newsletter789',
        openUrl: 'https://app.getresponse.com/newsletters/newsletter789/edit',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.getresponse.com/v3/newsletters',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': 'api-key test-api-key-12345',
          },
          body: expect.stringContaining('"subject":"Test Newsletter Subject"'),
        })
      );
    });

    it('should handle GetResponse API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ message: 'Invalid API key' }),
      } as Response);

      await expect(client.createNewsletterDraft(validRequest)).rejects.toThrow('Invalid API key');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.createNewsletterDraft(validRequest)).rejects.toThrow('Network error');
    });

    it('should include preheader in request when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ newsletterId: 'test123', href: '/newsletters/test123' }),
      } as Response);

      await client.createNewsletterDraft(validRequest);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(requestBody.settings?.preheader).toBe('Test preheader text');
    });

    it('should omit preheader from request when not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ newsletterId: 'test123', href: '/newsletters/test123' }),
      } as Response);

      const requestWithoutPreheader = { ...validRequest };
      delete requestWithoutPreheader.preheader;

      await client.createNewsletterDraft(requestWithoutPreheader);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(requestBody.settings).toBeUndefined();
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      const result = await client.testConnection();
      expect(result).toBe(true);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.getresponse.com/v3/accounts',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'X-Auth-Token': 'api-key test-api-key-12345',
          },
        })
      );
    });

    it('should return false for failed connection', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      } as Response);

      const result = await client.testConnection();
      expect(result).toBe(false);
    });

    it('should return false for network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.testConnection();
      expect(result).toBe(false);
    });
  });
});

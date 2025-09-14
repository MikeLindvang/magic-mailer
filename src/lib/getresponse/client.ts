import { z } from 'zod';

/**
 * GetResponse API v3 Client
 * 
 * Provides type-safe methods for interacting with GetResponse API endpoints.
 * Currently supports newsletter draft creation.
 */

/**
 * Schema for newsletter draft creation request
 */
export const zNewsletterDraftRequest = z.object({
  campaignId: z.string().min(1, 'Campaign ID is required'),
  fromFieldId: z.string().min(1, 'From field ID is required'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  preheader: z.string().max(150, 'Preheader too long').optional(),
  html: z.string().min(1, 'HTML content is required'),
  plain: z.string().min(1, 'Plain text content is required'),
});

export type NewsletterDraftRequest = z.infer<typeof zNewsletterDraftRequest>;

/**
 * GetResponse API response for newsletter creation
 */
export interface GetResponseNewsletterResponse {
  newsletterId: string;
  href: string;
  name: string;
  type: string;
  status: string;
  editor: string;
  subject: string;
  campaign: {
    campaignId: string;
    href: string;
    name: string;
  };
  sendOn: string | null;
  createdOn: string;
}

/**
 * Simplified response for our API
 */
export interface NewsletterDraftResponse {
  newsletterId: string;
  openUrl: string;
}

/**
 * GetResponse API client configuration
 */
interface GetResponseClientConfig {
  apiKey: string;
  baseUrl?: string;
}

/**
 * GetResponse API client class
 */
export class GetResponseClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: GetResponseClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.getresponse.com/v3';
  }

  /**
   * Creates a newsletter draft in GetResponse
   * 
   * @param request - Newsletter draft parameters
   * @returns Promise with newsletter ID and open URL
   */
  async createNewsletterDraft(request: NewsletterDraftRequest): Promise<NewsletterDraftResponse> {
    // Validate input
    const validatedRequest = zNewsletterDraftRequest.parse(request);

    // Prepare the request body for GetResponse API
    const requestBody = {
      name: `Draft - ${validatedRequest.subject}`, // Auto-generate name from subject
      type: 'newsletter',
      editor: 'custom', // Using custom HTML editor
      subject: validatedRequest.subject,
      campaign: {
        campaignId: validatedRequest.campaignId,
      },
      fromField: {
        fromFieldId: validatedRequest.fromFieldId,
      },
      content: {
        html: validatedRequest.html,
        plain: validatedRequest.plain,
      },
      ...(validatedRequest.preheader && {
        settings: {
          preheader: validatedRequest.preheader,
        },
      }),
    };

    try {
      const response = await fetch(`${this.baseUrl}/newsletters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': `api-key ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `GetResponse API error: ${response.status}`;
        
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // If error response is not JSON, use the raw text
          if (errorText) {
            errorMessage = errorText;
          }
        }
        
        throw new Error(errorMessage);
      }

      const newsletterData: GetResponseNewsletterResponse = await jsonResponse();

      // Extract newsletter ID from the response
      const newsletterId = newsletterData.newsletterId || 
        (newsletterData.href ? newsletterData.href.split('/').pop() : null);

      if (!newsletterId) {
        throw new Error('Failed to extract newsletter ID from GetResponse response');
      }

      // Generate the open URL for the newsletter editor
      // GetResponse newsletter editor URL pattern
      const openUrl = `https://app.getresponse.com/newsletters/${newsletterId}/edit`;

      return {
        newsletterId,
        openUrl,
      };

    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while creating newsletter draft');
    }
  }

  /**
   * Test the API connection by making a simple request
   * 
   * @returns Promise<boolean> - True if connection is successful
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/accounts`, {
        method: 'GET',
        headers: {
          'X-Auth-Token': `api-key ${this.apiKey}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Factory function to create a GetResponse client instance
 * 
 * @param apiKey - GetResponse API key
 * @returns GetResponseClient instance
 */
export function createGetResponseClient(apiKey: string): GetResponseClient {
  return new GetResponseClient({ apiKey });
}

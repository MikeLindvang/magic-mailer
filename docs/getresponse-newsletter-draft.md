# GetResponse Newsletter Draft API

This document describes how to create newsletter drafts using the stored GetResponse API key.

## Overview

The newsletter draft functionality allows you to create drafts in GetResponse using the stored and encrypted API key. The system handles authentication, encryption/decryption, and provides a clean API interface.

## API Endpoint

### POST `/api/getresponse/draft`

Creates a newsletter draft in GetResponse.

#### Request Body

```typescript
{
  campaignId: string;     // GetResponse campaign ID
  fromFieldId: string;    // GetResponse from field ID  
  subject: string;        // Newsletter subject (max 200 chars)
  preheader?: string;     // Optional preheader text (max 150 chars)
  html: string;          // HTML content
  plain: string;         // Plain text content
}
```

#### Response

**Success (200):**
```typescript
{
  ok: true;
  data: {
    newsletterId: string;  // GetResponse newsletter ID
    openUrl: string;       // URL to open newsletter in GetResponse editor
  }
}
```

**Error (400/401/500):**
```typescript
{
  ok: false;
  error: string;         // Error description
}
```

## Usage Examples

### Frontend (React/Next.js)

```typescript
async function createNewsletterDraft(draftData: {
  campaignId: string;
  fromFieldId: string;
  subject: string;
  preheader?: string;
  html: string;
  plain: string;
}) {
  try {
    const response = await fetch('/api/getresponse/draft', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(draftData),
    });

    const result = await jsonResponse();

    if (result.ok) {
      // Success - redirect to GetResponse editor
      window.open(result.data.openUrl, '_blank');
      return result.data;
    } else {
      // Handle error
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Failed to create newsletter draft:', error);
    throw error;
  }
}

// Usage
const draftData = {
  campaignId: 'your-campaign-id',
  fromFieldId: 'your-from-field-id',
  subject: 'Weekly Newsletter - January 2024',
  preheader: 'Latest updates and insights from our team',
  html: '<h1>Welcome to our newsletter!</h1><p>Here are this week\'s highlights...</p>',
  plain: 'Welcome to our newsletter!\n\nHere are this week\'s highlights...',
};

createNewsletterDraft(draftData)
  .then(result => {
    console.log('Newsletter draft created:', result.newsletterId);
  })
  .catch(error => {
    console.error('Error:', error.message);
  });
```

### Server-side (Node.js/API Route)

```typescript
import { createGetResponseClient } from '@/lib/getresponse/client';

// If you have the API key directly (not recommended for client-side)
const client = createGetResponseClient('your-api-key');

const result = await client.createNewsletterDraft({
  campaignId: 'your-campaign-id',
  fromFieldId: 'your-from-field-id',
  subject: 'Newsletter Subject',
  html: '<h1>HTML Content</h1>',
  plain: 'Plain text content',
});

console.log('Newsletter created:', result.newsletterId);
console.log('Edit URL:', result.openUrl);
```

## Prerequisites

1. **GetResponse Connection**: User must have saved their GetResponse API key using the connection save endpoint:
   ```
   POST /api/connections/getresponse/save
   { "apiKey": "your-getresponse-api-key" }
   ```

2. **Campaign ID**: You need a valid GetResponse campaign ID where the newsletter will be created.

3. **From Field ID**: You need a valid GetResponse from field ID for the sender information.

## Error Handling

The API provides specific error messages for common issues:

- **400 Bad Request**: 
  - Missing GetResponse connection
  - Invalid campaign ID or from field ID
  - Validation errors (empty subject, missing content, etc.)

- **401 Unauthorized**: 
  - Invalid or expired GetResponse API key
  - User not authenticated

- **500 Internal Server Error**: 
  - Failed to decrypt stored API key
  - GetResponse API errors
  - Network issues

## Security Notes

- API keys are encrypted using AES-256-GCM before storage
- Only masked versions (showing last 4 characters) are returned to the client
- Full API keys are only decrypted server-side for API calls
- All operations require user authentication via Clerk

## GetResponse API Integration

This implementation uses GetResponse API v3:
- Base URL: `https://api.getresponse.com/v3`
- Authentication: `X-Auth-Token: api-key {your-key}`
- Endpoint: `POST /newsletters`

The created newsletter will appear in your GetResponse dashboard as a draft that can be further edited and sent.

# Style Card Builder API

This API endpoint analyzes email samples to create comprehensive style cards that capture a user's unique writing voice and patterns.

## Endpoint

```
POST /api/style/build
```

## Authentication

Requires valid Clerk authentication. The style profile will be associated with the authenticated user's `userId`.

## Request Format

```json
{
  "emails": [
    {
      "subject": "Email subject line",
      "body": "Full email body content...",
      "ctr": 0.25,        // Optional: Click-through rate (0-1)
      "rpc": 15.50,       // Optional: Revenue per click
      "sentAt": "2024-01-15T10:00:00Z"  // Optional: ISO date string
    }
  ]
}
```

### Validation Rules

- **emails**: Array of 1-50 email objects
- **subject**: Required, non-empty string
- **body**: Required, non-empty string  
- **ctr**: Optional, number between 0-1
- **rpc**: Optional, non-negative number
- **sentAt**: Optional, valid ISO datetime string

## Response Format

### Success Response (200)

```json
{
  "ok": true,
  "data": {
    "style_profile_id": "abc123xyz789"
  }
}
```

### Error Responses

#### Validation Error (400)
```json
{
  "ok": false,
  "error": "Validation error: Subject is required"
}
```

#### Authentication Error (401)
```json
{
  "ok": false,
  "error": "Unauthorized"
}
```

#### Service Error (503)
```json
{
  "ok": false,
  "error": "AI analysis service temporarily unavailable"
}
```

#### Server Error (500)
```json
{
  "ok": false,
  "error": "Failed to build style card"
}
```

## Style Card Structure

The generated style card includes:

### Tone Analysis (0-100 scales)
- `formal_casual`: How formal vs casual is the language
- `professional_friendly`: How strictly business vs warm and friendly
- `direct_nurturing`: How straightforward vs supportive and caring
- `urgent_relaxed`: How time-sensitive vs laid-back is the messaging
- `confident_humble`: How assertive vs modest is the communication style

### Writing Statistics
- Average sentence length, paragraph length, word length
- Reading level assessment
- Complexity score (0-100)

### Pattern Identification
- Common opening phrases/structures
- Frequent transition words/phrases
- Typical CTA patterns and structures
- Common closing patterns
- P.S. usage frequency and patterns

### Style Habits
- Emoji usage frequency and most common types
- Punctuation preferences and frequencies
- Capitalization patterns
- Formatting preferences (bold, italics, lists, etc.)

### Performance Insights (when CTR/RPC data available)
- High-performing elements identification
- Optimal patterns based on engagement data

### Meta Information
- Confidence score based on sample size and consistency
- Analysis date range and email count

## Usage Examples

### Basic Marketing Email Analysis

```bash
curl -X POST https://your-domain.com/api/style/build \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-clerk-token" \
  -d '{
    "emails": [
      {
        "subject": "🚀 Your Weekly Marketing Boost is Here!",
        "body": "Hey there, marketing superstar! Hope your week is off to an amazing start...",
        "ctr": 0.23,
        "rpc": 15.50,
        "sentAt": "2024-01-15T10:00:00Z"
      }
    ]
  }'
```

### Multiple Email Analysis

```javascript
const response = await fetch('/api/style/build', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    emails: [
      {
        subject: "Newsletter: This Week's Insights",
        body: "Hello friends, I've been thinking about...",
        ctr: 0.35
      },
      {
        subject: "Quick Question About Your Goals",
        body: "Hi there! I was wondering if you could help me...",
        ctr: 0.28,
        rpc: 12.75
      }
    ]
  })
});

const result = await jsonResponse();
console.log('Style Profile ID:', result.data.style_profile_id);
```

## Database Storage

Style profiles are stored in the `style_profiles` collection with the following structure:

```json
{
  "_id": "generated-nanoid",
  "ownerId": "clerk-user-id", 
  "style_card": { /* Complete style analysis */ },
  "sources": ["Email: Subject 1", "Email: Subject 2"],
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

## Rate Limits & Considerations

- Maximum 50 emails per request
- OpenAI API calls may have latency (typically 5-15 seconds)
- Large email bodies may increase processing time
- Confidence scores improve with more email samples (5+ recommended)

## Error Handling

The endpoint includes comprehensive error handling for:
- Input validation errors
- Authentication failures  
- OpenAI API errors and timeouts
- Database connection issues
- JSON parsing errors

## Environment Variables Required

```bash
OPENAI_API_KEY=your-openai-api-key
MONGODB_URI=your-mongodb-connection-string
CLERK_SECRET_KEY=your-clerk-secret-key
```

## Testing

Run the test suite with:

```bash
npm test src/app/api/style/build/__tests__
npm test src/lib/llm/__tests__/styleCard.test.ts
```

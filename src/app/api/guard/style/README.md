# Style Guard API

The Style Guard API compares email drafts against style cards to identify mismatches and provide actionable fixes.

## Endpoint

`POST /api/guard/style`

## Request Format

```json
{
  "style_card": {
    "tone": "Professional yet approachable",
    "voice": "Expert consultant who cares about client success",
    "style": "Clear, actionable advice with specific examples",
    "audience": "Small business owners and marketing managers",
    "guidelines": [
      "Use active voice and direct language",
      "Include specific examples and actionable tips",
      "Maintain professional but warm tone"
    ],
    "examples": [
      "Here's exactly how to boost your email open rates...",
      "Quick question: What's your biggest marketing challenge right now?"
    ]
  },
  "draft": {
    "subject": "Weekly Marketing Tips",
    "html": "<h1>Hello!</h1><p>Here are some tips...</p>",
    "md": "# Hello!\n\nHere are some tips...",
    "txt": "Hello!\n\nHere are some tips..."
  }
}
```

## Response Format

### Success Response

```json
{
  "ok": true,
  "data": {
    "mismatches": [
      {
        "area": "Subject Line",
        "issue": "Subject line is too generic and doesn't create urgency or curiosity",
        "fix": "Make it more specific and action-oriented, e.g., '3 Marketing Wins You Can Implement This Week'"
      },
      {
        "area": "Opening",
        "issue": "Generic greeting doesn't establish expertise or show care for client success",
        "fix": "Start with a specific insight or question that demonstrates expertise, e.g., 'I noticed 73% of small businesses struggle with email engagement...'"
      }
    ],
    "overall_score": 72,
    "recommendations": [
      "Strengthen the opening to immediately establish expertise and care",
      "Add more specific, actionable examples throughout the content",
      "Include a clear call-to-action that invites engagement"
    ]
  }
}
```

### Error Response

```json
{
  "ok": false,
  "error": "Validation error: style_card.tone is required"
}
```

## Usage Example

```typescript
const response = await fetch('/api/guard/style', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    style_card: {
      tone: "Professional yet approachable",
      voice: "Expert consultant",
      style: "Clear and actionable",
      audience: "Small business owners"
    },
    draft: {
      subject: "Weekly Tips",
      html: "<p>Hello! Here are some tips...</p>",
      md: "Hello! Here are some tips...",
      txt: "Hello! Here are some tips..."
    }
  })
});

const result = await jsonResponse();

if (result.ok) {
  console.log('Style Analysis:', result.data);
  console.log('Overall Score:', result.data.overall_score);
  console.log('Mismatches:', result.data.mismatches);
} else {
  console.error('Error:', result.error);
}
```

## Authentication

This endpoint requires authentication. Include a valid session token in your request headers.

## Rate Limits

- Maximum 10 requests per minute per user
- Maximum draft size: 50KB
- Maximum style card size: 10KB

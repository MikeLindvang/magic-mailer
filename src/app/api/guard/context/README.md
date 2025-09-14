# Context Guard API

The Context Guard API validates factual claims in draft content against provided context chunks to ensure accuracy and prevent misinformation.

## Endpoint

```
POST /api/guard/context
```

## Authentication

Requires valid Clerk authentication. Include the session token in your request headers.

## Request Format

```typescript
{
  "contextChunks": [
    {
      "chunkId": "chunk_123",
      "md_text": "The company reported a 25% increase in sales during Q3 2024, driven primarily by the new product launch in September."
    },
    {
      "chunkId": "chunk_456", 
      "md_text": "Customer satisfaction surveys showed an 87% approval rating for the new features introduced in the latest update."
    }
  ],
  "draft": {
    "md": "Our latest product launch drove a 25% sales increase and achieved 87% customer satisfaction!",
    "html": "<p>Our latest product launch drove a 25% sales increase and achieved 87% customer satisfaction!</p>"
  }
}
```

### Request Schema

- `contextChunks` (required): Array of context chunks to validate against
  - `chunkId` (string): Unique identifier for the chunk
  - `md_text` (string): The markdown text content of the chunk
- `draft` (required): The draft content to validate
  - `md` (string, optional): Markdown version of the draft
  - `html` (string, optional): HTML version of the draft
  - Note: At least one of `md` or `html` must be provided

## Response Format

### Success Response (200)

```typescript
{
  "ok": true,
  "data": {
    "claims": [
      {
        "claim": "Our latest product launch drove a 25% sales increase",
        "status": "supported",
        "supporting_chunks": ["chunk_123"],
        "evidence": "Chunk 123 explicitly states a 25% increase in sales during Q3 2024 driven by the new product launch",
        "confidence": 0.95
      },
      {
        "claim": "achieved 87% customer satisfaction",
        "status": "supported", 
        "supporting_chunks": ["chunk_456"],
        "evidence": "Chunk 456 reports 87% approval rating from customer satisfaction surveys",
        "confidence": 0.92
      }
    ],
    "summary": {
      "total_claims": 2,
      "supported_claims": 2,
      "unsupported_claims": 0,
      "support_percentage": 100
    },
    "recommendations": [
      "Consider adding the specific time period (Q3 2024) to provide more context",
      "Link customer satisfaction to specific features mentioned in the surveys"
    ]
  }
}
```

### Error Responses

#### 401 Unauthorized
```typescript
{
  "ok": false,
  "error": "Unauthorized"
}
```

#### 400 Bad Request
```typescript
{
  "ok": false,
  "error": "Validation error: At least one context chunk is required"
}
```

#### 500 Internal Server Error
```typescript
{
  "ok": false,
  "error": "Failed to validate context: OpenAI API error"
}
```

## Response Schema

### FactualClaim
- `claim` (string): The exact factual claim extracted from the draft
- `status` ("supported" | "unsupported"): Whether the claim is supported by context
- `supporting_chunks` (string[]): Array of chunk IDs that support this claim
- `evidence` (string): Explanation of the supporting evidence or why it's unsupported
- `confidence` (number): Confidence score between 0.0 and 1.0

### ValidationSummary
- `total_claims` (number): Total number of factual claims found
- `supported_claims` (number): Number of claims supported by context
- `unsupported_claims` (number): Number of claims not supported by context
- `support_percentage` (number): Percentage of claims that are supported

## Usage Examples

### Basic Validation

```javascript
const response = await fetch('/api/guard/context', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    contextChunks: [
      {
        chunkId: 'research_data_1',
        md_text: 'Study shows 73% of users prefer the new interface design over the previous version.'
      }
    ],
    draft: {
      md: 'Research proves that 73% of users love our new design!'
    }
  })
});

const result = await jsonResponse();
if (result.ok) {
  console.log(`Found ${result.data.summary.total_claims} claims`);
  console.log(`${result.data.summary.support_percentage}% are supported`);
}
```

### Handling Unsupported Claims

```javascript
const result = await jsonResponse();
if (result.ok) {
  const unsupportedClaims = result.data.claims.filter(claim => claim.status === 'unsupported');
  
  if (unsupportedClaims.length > 0) {
    console.warn('Unsupported claims found:');
    unsupportedClaims.forEach(claim => {
      console.log(`- "${claim.claim}": ${claim.evidence}`);
    });
  }
}
```

## Validation Criteria

### Supported Claims
- The context chunks contain explicit information that confirms the claim
- The claim is a reasonable inference from the provided evidence
- Multiple chunks corroborate the same information

### Unsupported Claims
- No context chunks mention or support the claim
- The claim contradicts information in the context chunks
- The claim requires external knowledge not present in the chunks
- The claim is speculative or opinion-based without supporting evidence

## Best Practices

1. **Provide Comprehensive Context**: Include all relevant chunks that might support claims in your draft
2. **Use Specific Claims**: The system works best with concrete, factual statements rather than vague assertions
3. **Review Confidence Scores**: Lower confidence scores may indicate ambiguous claims that need clarification
4. **Act on Recommendations**: The API provides actionable suggestions for improving claim support
5. **Handle Unsupported Claims**: Either remove unsupported claims or add supporting context chunks

## Rate Limits

This endpoint uses the OpenAI API and is subject to:
- Authentication rate limits from Clerk
- OpenAI API rate limits
- Processing time depends on draft length and number of context chunks

## Error Handling

Always check the `ok` field in the response:

```javascript
const result = await jsonResponse();
if (!result.ok) {
  console.error('Validation failed:', result.error);
  // Handle error appropriately
}
```

Common error scenarios:
- Missing or invalid authentication
- Malformed request body
- OpenAI API unavailable
- Invalid JSON in LLM response
- Network connectivity issues

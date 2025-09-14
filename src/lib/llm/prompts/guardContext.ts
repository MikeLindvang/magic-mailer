/**
 * Context Guard Prompt
 * 
 * Validates factual claims in a draft against provided context chunks.
 * Identifies which claims are supported by evidence and which are unsupported.
 */

interface ContextChunk {
  chunkId: string;
  md_text: string;
}

interface Draft {
  html?: string;
  md?: string;
}

export function guardContextPrompt(contextChunks: ContextChunk[], draft: Draft): string {
  const draftContent = draft.md || draft.html || '';
  
  return `You are a fact-checking expert. Your task is to validate factual claims in a draft against provided context chunks and determine which claims are supported by evidence.

## CONTEXT CHUNKS:

${contextChunks.map((chunk, index) => `
**Chunk ${index + 1} (ID: ${chunk.chunkId}):**
${chunk.md_text}
`).join('\n')}

## DRAFT TO VALIDATE:

${draftContent}

## VALIDATION INSTRUCTIONS:

Carefully analyze the draft to identify all factual claims, then check each claim against the provided context chunks. A factual claim includes:

1. **Specific Facts**: Numbers, dates, statistics, research findings
2. **Statements of Truth**: Assertions about what is true, what exists, what happened
3. **Causal Relationships**: Claims about cause and effect
4. **Comparisons**: Statements comparing entities, performance, or characteristics
5. **Attributions**: Claims about who said or did something
6. **Process Descriptions**: How something works or is done
7. **Definitions**: What something is or means

For each factual claim, determine:
- **SUPPORTED**: The claim is directly supported by evidence in one or more context chunks
- **UNSUPPORTED**: The claim cannot be verified from the provided context chunks

## VALIDATION CRITERIA:

**SUPPORTED Claims:**
- The context chunks contain explicit information that confirms the claim
- The claim is a reasonable inference from the provided evidence
- Multiple chunks corroborate the same information

**UNSUPPORTED Claims:**
- No context chunks mention or support the claim
- The claim contradicts information in the context chunks
- The claim requires external knowledge not present in the chunks
- The claim is speculative or opinion-based without supporting evidence

## REQUIRED JSON RESPONSE FORMAT:

You must respond with valid JSON in exactly this structure:

{
  "claims": [
    {
      "claim": "Exact text of the factual claim from the draft",
      "status": "supported" | "unsupported",
      "supporting_chunks": ["chunkId1", "chunkId2"] | [],
      "evidence": "Brief explanation of the supporting evidence or why it's unsupported",
      "confidence": 0.95
    }
  ],
  "summary": {
    "total_claims": 5,
    "supported_claims": 3,
    "unsupported_claims": 2,
    "support_percentage": 60
  },
  "recommendations": [
    "Specific recommendation for handling unsupported claims",
    "Suggestion for strengthening supported claims with better evidence"
  ]
}

## IMPORTANT GUIDELINES:

1. **Be Precise**: Extract exact claims as they appear in the draft, don't paraphrase.

2. **Conservative Validation**: When in doubt, mark as unsupported rather than supported.

3. **Cite Evidence**: For supported claims, reference the specific chunk IDs that provide evidence.

4. **Explain Reasoning**: Provide clear evidence or explanation for each validation decision.

5. **Confidence Scoring**: Rate your confidence in each validation (0.0 to 1.0).

6. **Focus on Facts**: Ignore opinions, marketing language, and subjective statements unless they make factual claims.

7. **Context Boundaries**: Only use the provided context chunks - don't rely on external knowledge.

8. **Partial Support**: If a claim is partially supported, note which parts are supported and which aren't.

9. **Chunk Attribution**: Always list the specific chunk IDs that support each claim.

10. **Actionable Recommendations**: Provide specific guidance on how to handle unsupported claims.

Analyze the draft thoroughly and provide your response in the exact JSON format specified above.`;
}

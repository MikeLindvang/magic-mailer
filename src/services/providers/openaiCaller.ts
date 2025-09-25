import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Call OpenAI GPT-4o-mini with JSON-only response requirement
 * @param prompt - The user prompt to send to the model
 * @returns Promise<string> - Raw JSON response from the model
 */
export async function callOpenAIJSON(prompt: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Return ONLY valid JSON, no commentary.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    return content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error(`OpenAI API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

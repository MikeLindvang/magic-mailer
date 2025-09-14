/**
 * Email Generation Prompt Template
 * 
 * Generates PAS (Problem-Agitate-Solution) format emails using contextual information
 * from the project's knowledge base. Outputs structured email content in multiple formats.
 */

export interface GenerateEmailOptions {
  angle: string;
  projectName: string;
  audience?: string;
  length?: 'short' | 'medium' | 'long';
  constraints?: string;
  mustInclude?: string;
  contextPack: string;
  defaultLink?: string;
}

/**
 * Generate the system prompt for PAS email generation
 */
export function generateEmailPrompt({
  angle,
  projectName,
  audience,
  length = 'medium',
  constraints,
  mustInclude,
  contextPack,
  defaultLink
}: GenerateEmailOptions): string {
  const lengthGuidance = {
    short: 'Keep the email concise (150-250 words total)',
    medium: 'Aim for a moderate length (250-400 words total)', 
    long: 'Create a comprehensive email (400-600 words total)'
  };

  return `You are an expert email copywriter specializing in the PAS (Problem-Agitate-Solution) framework. Generate a compelling email using ONLY the facts and information provided in the context below.

## CONTEXT INFORMATION
${contextPack}

## EMAIL REQUIREMENTS
- **Project**: ${projectName}
- **Angle**: ${angle} (Problem-Agitate-Solution structure)
- **Target Audience**: ${audience || 'General audience interested in the project'}
- **Length**: ${lengthGuidance[length]}
${constraints ? `- **Constraints**: ${constraints}` : ''}
${mustInclude ? `- **Must Include**: ${mustInclude}` : ''}
${defaultLink ? `- **Primary Link**: ${defaultLink}` : ''}

## PAS FRAMEWORK STRUCTURE
1. **Problem**: Identify a specific pain point your audience faces
2. **Agitate**: Amplify the consequences and emotional impact of this problem
3. **Solution**: Present your project/product as the clear solution

## OUTPUT REQUIREMENTS
You must respond with a valid JSON object containing exactly these fields:

\`\`\`json
{
  "subject": "Compelling subject line (45 characters or less preferred)",
  "preheader": "Supporting preview text that complements the subject",
  "html": "Full HTML email with proper structure, inline CSS for email clients, and tactile design elements",
  "md": "Clean markdown version with proper formatting and structure",
  "txt": "Plain text version that's readable and well-formatted"
}
\`\`\`

## CONTENT GUIDELINES
- **Use ONLY information from the provided context** - do not invent facts
- **Subject line**: Compelling, specific, ideally under 45 characters
- **Preheader**: 40-90 characters that adds value to the subject line
- **Problem section**: Start with a relatable problem your audience faces
- **Agitate section**: Describe the consequences and frustrations of this problem
- **Solution section**: Present your project as the solution with specific benefits
- **Call-to-action**: Clear, action-oriented language
- **Tone**: Professional yet conversational, warm and human
- **Email client compatibility**: Use inline CSS, avoid complex layouts

## HTML FORMATTING REQUIREMENTS
- Use inline CSS styles for email client compatibility
- Include proper email HTML structure with DOCTYPE and meta tags
- Use web-safe fonts (Arial, Helvetica, Georgia, Times New Roman)
- Ensure mobile responsiveness with max-width: 600px
- Include alt text for any images referenced
- Use proper email-safe color codes

## MARKDOWN FORMATTING
- Use proper markdown syntax with headers, emphasis, and lists
- Include clear section breaks between Problem, Agitate, and Solution
- Format links properly with descriptive text

## TEXT FORMATTING
- Use clear line breaks and spacing for readability
- Include section headers for Problem, Agitate, Solution
- Keep formatting simple but organized

Generate the email now using the PAS framework and the provided context information.`;
}

/**
 * Default configuration for PAS email generation
 */
export const PAS_EMAIL_CONFIG = {
  maxTokens: 2000,
  temperature: 0.7,
  model: 'gpt-4o-mini'
} as const;

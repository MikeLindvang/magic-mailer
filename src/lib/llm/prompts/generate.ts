/**
 * Email Generation Prompt Template
 * 
 * Generates PAS (Problem-Agitate-Solution) format emails using contextual information
 * from the project's knowledge base. Outputs structured email content in multiple formats.
 */

export interface ToneModifier {
  name: string;
  description: string;
  instructions: string;
  temperatureAdjustment: number; // -0.3 to +0.3 from base
  examples: string[];
}

export interface StyleModifier {
  name: string;
  description: string;
  instructions: string;
  lengthImpact: 'shorter' | 'neutral' | 'longer';
  examples: string[];
}

/**
 * Available tone modifiers for email generation
 */
export const TONE_MODIFIERS: Record<string, ToneModifier> = {
  professional: {
    name: 'Professional',
    description: 'Formal, authoritative, business-focused',
    instructions: 'Use formal language, industry terminology, and maintain a professional demeanor throughout. Avoid casual expressions and focus on credibility.',
    temperatureAdjustment: -0.1,
    examples: ['We have identified', 'Our analysis indicates', 'Industry best practices suggest']
  },
  conversational: {
    name: 'Conversational',
    description: 'Friendly, approachable, like talking to a colleague',
    instructions: 'Write as if speaking directly to a friend or colleague. Use contractions, casual language, and personal pronouns. Make it feel like a one-on-one conversation.',
    temperatureAdjustment: 0,
    examples: ["Here's the thing...", "You know that feeling when...", "Let me ask you this..."]
  },
  hype: {
    name: 'Hype',
    description: 'High-energy, exciting, urgent, creates FOMO',
    instructions: 'Use high-energy language, exclamation points, urgency indicators, and FOMO-inducing phrases. Create excitement and momentum. Use power words and emotional triggers.',
    temperatureAdjustment: 0.2,
    examples: ['This is HUGE!', 'Limited time only!', 'Don\'t miss out!', 'Game-changer alert!']
  },
  humorous: {
    name: 'Humorous',
    description: 'Light-hearted, witty, entertaining while staying on message',
    instructions: 'Incorporate light humor, witty observations, and entertaining analogies. Keep it professional but fun. Use humor to make points more memorable, not to distract from the message.',
    temperatureAdjustment: 0.2,
    examples: ['Like trying to fold a fitted sheet...', 'More confusing than IKEA instructions', 'Easier than explaining TikTok to your parents']
  },
  empathetic: {
    name: 'Empathetic',
    description: 'Understanding, supportive, acknowledges struggles',
    instructions: 'Show deep understanding of the audience\'s pain points. Use empathetic language that validates their feelings and experiences. Be supportive and encouraging.',
    temperatureAdjustment: 0,
    examples: ['I totally get it...', 'You\'re not alone in feeling...', 'It\'s completely understandable that...']
  },
  authoritative: {
    name: 'Authoritative',
    description: 'Expert, confident, backed by data and experience',
    instructions: 'Position as an expert with deep knowledge. Use data, statistics, and authoritative statements. Be confident without being arrogant. Reference experience and proven results.',
    temperatureAdjustment: -0.1,
    examples: ['Research shows that...', 'In our 10+ years of experience...', 'Data consistently proves...']
  }
};

/**
 * Available style modifiers for email structure and approach
 */
export const STYLE_MODIFIERS: Record<string, StyleModifier> = {
  direct: {
    name: 'Direct',
    description: 'Straight to the point, no fluff, clear and concise',
    instructions: 'Cut straight to the chase. Eliminate unnecessary words and get to the point quickly. Use short sentences and clear, direct language.',
    lengthImpact: 'shorter',
    examples: ['Bottom line:', 'Here\'s what matters:', 'The facts:']
  },
  storytelling: {
    name: 'Storytelling',
    description: 'Narrative-driven, uses stories and examples to illustrate points',
    instructions: 'Weave in relevant stories, case studies, or examples to illustrate each point. Use narrative structure to make the content more engaging and memorable.',
    lengthImpact: 'longer',
    examples: ['Let me tell you about Sarah...', 'Picture this scenario...', 'Here\'s what happened when...']
  },
  datadriven: {
    name: 'Data-Driven',
    description: 'Heavy use of statistics, research, and concrete numbers',
    instructions: 'Support every claim with data, statistics, or research. Use specific numbers and percentages. Reference studies and concrete evidence.',
    lengthImpact: 'neutral',
    examples: ['73% of users reported...', 'Studies show a 40% increase...', 'Research from Stanford indicates...']
  },
  visual: {
    name: 'Visual',
    description: 'Uses analogies, metaphors, and vivid imagery',
    instructions: 'Paint vivid pictures with words. Use analogies, metaphors, and descriptive language that helps readers visualize concepts and outcomes.',
    lengthImpact: 'neutral',
    examples: ['Think of it like...', 'Imagine if...', 'Picture your workflow as a highway...']
  },
  listicle: {
    name: 'Listicle',
    description: 'Structured with clear lists, bullet points, and numbered items',
    instructions: 'Organize content into clear lists, numbered points, and bullet formats. Make it scannable and easy to digest with clear structure.',
    lengthImpact: 'neutral',
    examples: ['Here are 5 signs that...', 'The 3 biggest mistakes...', '7 ways to improve...']
  }
};

export interface GenerateEmailOptions {
  angle: string;
  projectName: string;
  audience?: string;
  length?: 'short' | 'medium' | 'long';
  tone?: keyof typeof TONE_MODIFIERS;
  style?: keyof typeof STYLE_MODIFIERS;
  constraints?: string;
  mustInclude?: string;
  contextPack: string;
  defaultLink?: string;
}

/**
 * Generate tone-specific instructions
 */
function getToneInstructions(tone?: keyof typeof TONE_MODIFIERS): string {
  if (!tone || tone === 'conversational') return 'Professional yet conversational, warm and human';
  
  const toneConfig = TONE_MODIFIERS[tone];
  return `${toneConfig.instructions}\n\n**Tone Examples**: ${toneConfig.examples.join(', ')}`;
}

/**
 * Generate style-specific instructions  
 */
function getStyleInstructions(style?: keyof typeof STYLE_MODIFIERS): string {
  if (!style || style === 'direct') return '';
  
  const styleConfig = STYLE_MODIFIERS[style];
  return `\n\n## STYLE APPROACH\n${styleConfig.instructions}\n\n**Style Examples**: ${styleConfig.examples.join(', ')}`;
}

/**
 * Adjust length guidance based on style modifier
 */
function adjustLengthGuidance(
  length: 'short' | 'medium' | 'long', 
  style?: keyof typeof STYLE_MODIFIERS
): string {
  const baseLengths = {
    short: { min: 150, max: 250 },
    medium: { min: 250, max: 400 }, 
    long: { min: 400, max: 600 }
  };
  
  let adjusted = baseLengths[length];
  
  if (style && STYLE_MODIFIERS[style]) {
    const styleConfig = STYLE_MODIFIERS[style];
    switch (styleConfig.lengthImpact) {
      case 'shorter':
        adjusted = { min: adjusted.min - 50, max: adjusted.max - 50 };
        break;
      case 'longer':
        adjusted = { min: adjusted.min + 50, max: adjusted.max + 100 };
        break;
      // 'neutral' keeps the same length
    }
  }
  
  return `Aim for ${adjusted.min}-${adjusted.max} words total`;
}

/**
 * Generate the system prompt for PAS email generation with tone and style modifiers
 */
export function generateEmailPrompt({
  angle,
  projectName,
  audience,
  length = 'medium',
  tone,
  style,
  constraints,
  mustInclude,
  contextPack,
  defaultLink
}: GenerateEmailOptions): string {
  const lengthGuidance = adjustLengthGuidance(length, style);
  const toneInstructions = getToneInstructions(tone);
  const styleInstructions = getStyleInstructions(style);

  return `You are an expert email copywriter specializing in the PAS (Problem-Agitate-Solution) framework. Generate a compelling email using ONLY the facts and information provided in the context below.

## CONTEXT INFORMATION
${contextPack}

## EMAIL REQUIREMENTS
- **Project**: ${projectName}
- **Angle**: ${angle} (Problem-Agitate-Solution structure)
- **Target Audience**: ${audience || 'General audience interested in the project'}
- **Length**: ${lengthGuidance}
- **Tone**: ${tone ? TONE_MODIFIERS[tone].name : 'Conversational'} - ${tone ? TONE_MODIFIERS[tone].description : 'Friendly and approachable'}
- **Style**: ${style ? STYLE_MODIFIERS[style].name : 'Direct'} - ${style ? STYLE_MODIFIERS[style].description : 'Straight to the point'}
${constraints ? `- **Constraints**: ${constraints}` : ''}
${mustInclude ? `- **Must Include**: ${mustInclude}` : ''}
${defaultLink ? `- **Primary Link**: ${defaultLink}` : ''}

## PAS FRAMEWORK STRUCTURE
1. **Problem**: Identify a specific pain point your audience faces
2. **Agitate**: Amplify the consequences and emotional impact of this problem
3. **Solution**: Present your project/product as the clear solution
${styleInstructions}

## OUTPUT REQUIREMENTS
You must respond with a valid JSON object containing exactly these fields:

\`\`\`json
{
  "subject": "Compelling subject line (45 characters or less preferred). DO NOT use AI tropes like 'Unleashed' or 'Skyrocket'.",
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
- **Tone**: ${toneInstructions}
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
 * Get email configuration with tone-based temperature adjustment
 */
export function getEmailConfig(tone?: keyof typeof TONE_MODIFIERS) {
  const baseTone = TONE_MODIFIERS.conversational;
  const selectedTone = tone ? TONE_MODIFIERS[tone] : baseTone;
  
  return {
    maxTokens: 2000,
    temperature: Math.max(0.1, Math.min(1.0, 0.7 + selectedTone.temperatureAdjustment)),
    model: 'gpt-4o-mini'
  } as const;
}

/**
 * Legacy export for backward compatibility
 */
export const PAS_EMAIL_CONFIG = getEmailConfig();

/**
 * Helper to get all available tones
 */
export function getAvailableTones(): Array<{key: string, name: string, description: string}> {
  return Object.entries(TONE_MODIFIERS).map(([key, config]) => ({
    key,
    name: config.name,
    description: config.description
  }));
}

/**
 * Helper to get all available styles
 */
export function getAvailableStyles(): Array<{key: string, name: string, description: string}> {
  return Object.entries(STYLE_MODIFIERS).map(([key, config]) => ({
    key,
    name: config.name,
    description: config.description
  }));
}

/**
 * Style Card Analysis Prompt Template
 * 
 * Analyzes email content to extract writing style characteristics
 * for personalized content generation.
 */

export interface EmailAnalysisInput {
  subject: string;
  body: string;
  ctr?: number;      // Click-through rate
  rpc?: number;      // Revenue per click
  sentAt?: string;   // ISO date string
}

export interface StyleCard {
  // Tone Analysis (0-100 sliders)
  tone: {
    formal_casual: number;        // 0 = very formal, 100 = very casual
    professional_friendly: number; // 0 = strictly professional, 100 = very friendly
    direct_nurturing: number;     // 0 = very direct, 100 = very nurturing
    urgent_relaxed: number;       // 0 = highly urgent, 100 = very relaxed
    confident_humble: number;     // 0 = very confident, 100 = very humble
  };
  
  // Writing Statistics
  writing_stats: {
    avg_sentence_length: number;
    avg_paragraph_length: number;
    avg_word_length: number;
    reading_level: string;        // e.g., "8th grade", "college level"
    complexity_score: number;     // 0-100, higher = more complex
  };
  
  // Common Patterns
  patterns: {
    // Opening patterns
    openers: string[];            // Common ways to start emails
    
    // Transition phrases
    transitions: string[];        // Common transition words/phrases
    
    // Call-to-action patterns
    cta_patterns: string[];       // Common CTA structures and phrases
    
    // Closing patterns
    closers: string[];            // Common ways to end emails
    
    // P.S. usage policy
    ps_usage: 'never' | 'rarely' | 'sometimes' | 'often' | 'always';
    ps_patterns: string[];        // Common P.S. structures if used
  };
  
  // Style Habits
  habits: {
    emoji_usage: 'none' | 'minimal' | 'moderate' | 'frequent';
    emoji_types: string[];        // Most commonly used emojis
    
    punctuation_style: {
      exclamation_frequency: 'rare' | 'occasional' | 'frequent';
      question_frequency: 'rare' | 'occasional' | 'frequent';
      ellipsis_usage: 'none' | 'rare' | 'occasional' | 'frequent';
      dash_usage: 'none' | 'rare' | 'occasional' | 'frequent';
    };
    
    capitalization: {
      all_caps_frequency: 'never' | 'rare' | 'occasional' | 'frequent';
      title_case_preference: boolean;
    };
    
    formatting: {
      uses_bold: boolean;
      uses_italics: boolean;
      uses_underline: boolean;
      uses_bullet_points: boolean;
      uses_numbered_lists: boolean;
    };
  };
  
  // Performance Insights (if CTR/RPC data available)
  performance_insights?: {
    high_performing_subjects: string[];
    high_performing_openers: string[];
    high_performing_ctas: string[];
    optimal_email_length: 'short' | 'medium' | 'long';
    best_sending_patterns: string[];
  };
  
  // Meta Information
  meta: {
    total_emails_analyzed: number;
    date_range: {
      earliest: string;
      latest: string;
    };
    confidence_score: number;     // 0-100, based on sample size and consistency
  };
}

export function createStyleAnalysisPrompt(emails: EmailAnalysisInput[]): string {
  const emailCount = emails.length;
  const emailSamples = emails.map((email, index) => `
EMAIL ${index + 1}:
Subject: ${email.subject}
Body: ${email.body}
${email.ctr ? `CTR: ${email.ctr}` : ''}
${email.rpc ? `RPC: ${email.rpc}` : ''}
${email.sentAt ? `Sent: ${email.sentAt}` : ''}
---`).join('\n');

  return `You are an expert email marketing analyst specializing in writing style analysis. Your task is to analyze the provided email samples and create a comprehensive style card that captures the writer's unique voice, patterns, and characteristics.

ANALYSIS TASK:
Analyze ${emailCount} email samples to extract detailed writing style characteristics. Focus on identifying consistent patterns, tone markers, structural elements, and stylistic habits that define this writer's unique voice.

EMAIL SAMPLES:
${emailSamples}

ANALYSIS REQUIREMENTS:

1. TONE ANALYSIS (0-100 scales):
   - formal_casual: How formal vs casual is the language?
   - professional_friendly: How strictly business vs warm and friendly?
   - direct_nurturing: How straightforward vs supportive and caring?
   - urgent_relaxed: How time-sensitive vs laid-back is the messaging?
   - confident_humble: How assertive vs modest is the communication style?

2. WRITING STATISTICS:
   - Calculate average sentence length, paragraph length, word length
   - Determine reading level and complexity score
   - Base calculations on actual content analysis

3. PATTERN IDENTIFICATION:
   - Extract 3-5 most common opening phrases/structures
   - Identify 3-5 frequent transition words/phrases
   - Catalog 3-5 typical CTA patterns and structures
   - Note 3-5 common closing patterns
   - Assess P.S. usage frequency and patterns

4. STYLE HABITS:
   - Emoji usage frequency and most common types
   - Punctuation preferences and frequencies
   - Capitalization patterns
   - Formatting preferences (bold, italics, lists, etc.)

5. PERFORMANCE INSIGHTS (if CTR/RPC data available):
   - Identify high-performing elements
   - Determine optimal patterns based on engagement data

6. META INFORMATION:
   - Provide confidence score based on sample size and consistency
   - Include analysis date range

CRITICAL REQUIREMENTS:
- Base all analysis on actual patterns observed in the emails
- Provide specific examples from the content when possible
- Ensure tone scores reflect genuine stylistic tendencies
- Be precise with numerical measurements
- Include confidence indicators for recommendations

RESPONSE FORMAT:
Return ONLY a valid JSON object matching the StyleCard interface. No additional text, explanations, or markdown formatting.

The JSON should be complete, accurate, and directly usable for generating new content in the same style.`;
}

export function validateStyleCard(data: unknown): StyleCard {
  // Basic validation - in a real implementation, you'd use Zod schema
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid style card data');
  }
  
  // Return the data as StyleCard (in production, add proper validation)
  return data as StyleCard;
}

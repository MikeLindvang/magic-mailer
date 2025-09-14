/**
 * Test suite for style card functionality
 * 
 * These tests verify the style card prompt generation and validation logic.
 * Note: API endpoint tests would require a test environment with authentication.
 */

import { 
  createStyleAnalysisPrompt, 
  validateStyleCard,
  type EmailAnalysisInput,
  type StyleCard 
} from '../prompts/styleCard';

describe('Style Card Analysis', () => {
  const sampleEmails: EmailAnalysisInput[] = [
    {
      subject: "🚀 Your Weekly Marketing Boost is Here!",
      body: `Hey there, marketing superstar! 👋

Hope your week is off to an amazing start. I've got something special for you today that's going to make your campaigns absolutely shine.

You know how we're always talking about engagement? Well, I just discovered this game-changing technique that increased our client's open rates by 47% last month. 

Here's the thing - most people overcomplicate their subject lines. But what if I told you the secret is actually in the SIMPLICITY?

→ Keep it under 6 words when possible
→ Use numbers (they're magnetic!) 
→ Ask questions that create curiosity

Want to see this in action? I've put together a quick 5-minute video showing exactly how Sarah from Denver went from 12% to 31% open rates using just this one trick.

[Watch the Video Now →]

Trust me, this is the kind of stuff that separates the pros from everyone else.

Talk soon,
Alex

P.S. - If you implement this technique this week and see results, shoot me an email! I love hearing success stories. 💪`,
      ctr: 0.23,
      rpc: 15.50,
      sentAt: "2024-01-15T10:00:00Z"
    },
    {
      subject: "Quick question about your goals...",
      body: `Hi friend,

I was thinking about our conversation last week, and I had to ask...

What's the ONE thing that would make the biggest difference in your business right now?

I'm not talking about the nice-to-haves or the someday dreams. I mean the ONE breakthrough that would change everything.

Because here's what I've learned after helping 500+ entrepreneurs: most people are working on the wrong things.

They're optimizing their website when they should be building relationships.
They're perfecting their product when they should be talking to customers.
They're planning when they should be doing.

So let me ask you directly - what's YOUR one thing?

Hit reply and tell me. I read every email personally, and I'd love to help you get clarity on this.

Cheering you on,
Alex

P.S. - Sometimes the answer isn't what we think it should be. And that's okay. The magic happens when we get honest about where we really are.`,
      ctr: 0.31,
      rpc: 22.75,
      sentAt: "2024-01-22T14:30:00Z"
    }
  ];

  describe('createStyleAnalysisPrompt', () => {
    it('should generate a comprehensive analysis prompt', () => {
      const prompt = createStyleAnalysisPrompt(sampleEmails);
      
      expect(prompt).toContain('You are an expert email marketing analyst');
      expect(prompt).toContain('2 email samples');
      expect(prompt).toContain('🚀 Your Weekly Marketing Boost is Here!');
      expect(prompt).toContain('Quick question about your goals...');
      expect(prompt).toContain('CTR: 0.23');
      expect(prompt).toContain('RPC: 15.5');
      expect(prompt).toContain('TONE ANALYSIS');
      expect(prompt).toContain('WRITING STATISTICS');
      expect(prompt).toContain('PATTERN IDENTIFICATION');
      expect(prompt).toContain('Return ONLY a valid JSON object');
    });

    it('should handle single email input', () => {
      const singleEmail = [sampleEmails[0]];
      const prompt = createStyleAnalysisPrompt(singleEmail);
      
      expect(prompt).toContain('1 email samples');
      expect(prompt).toContain('EMAIL 1:');
      expect(prompt).not.toContain('EMAIL 2:');
    });

    it('should handle emails without performance metrics', () => {
      const emailsWithoutMetrics: EmailAnalysisInput[] = [
        {
          subject: "Test Subject",
          body: "Test body content"
        }
      ];
      
      const prompt = createStyleAnalysisPrompt(emailsWithoutMetrics);
      
      expect(prompt).toContain('Test Subject');
      expect(prompt).toContain('Test body content');
      expect(prompt).not.toContain('CTR:');
      expect(prompt).not.toContain('RPC:');
    });
  });

  describe('validateStyleCard', () => {
    const validStyleCard: StyleCard = {
      tone: {
        formal_casual: 75,
        professional_friendly: 80,
        direct_nurturing: 65,
        urgent_relaxed: 45,
        confident_humble: 70
      },
      writing_stats: {
        avg_sentence_length: 15.2,
        avg_paragraph_length: 3.5,
        avg_word_length: 4.8,
        reading_level: "8th grade",
        complexity_score: 45
      },
      patterns: {
        openers: ["Hey there", "Hi friend", "Hope your week"],
        transitions: ["Here's the thing", "Because", "So let me ask"],
        cta_patterns: ["Watch the Video Now", "Hit reply and tell me"],
        closers: ["Talk soon", "Cheering you on"],
        ps_usage: "often",
        ps_patterns: ["P.S. - If you", "P.S. - Sometimes"]
      },
      habits: {
        emoji_usage: "moderate",
        emoji_types: ["🚀", "👋", "💪"],
        punctuation_style: {
          exclamation_frequency: "frequent",
          question_frequency: "occasional",
          ellipsis_usage: "occasional",
          dash_usage: "frequent"
        },
        capitalization: {
          all_caps_frequency: "rare",
          title_case_preference: true
        },
        formatting: {
          uses_bold: false,
          uses_italics: false,
          uses_underline: false,
          uses_bullet_points: true,
          uses_numbered_lists: false
        }
      },
      performance_insights: {
        high_performing_subjects: ["Quick question about your goals..."],
        high_performing_openers: ["Hi friend"],
        high_performing_ctas: ["Hit reply and tell me"],
        optimal_email_length: "medium",
        best_sending_patterns: ["Weekday mornings"]
      },
      meta: {
        total_emails_analyzed: 2,
        date_range: {
          earliest: "2024-01-15T10:00:00Z",
          latest: "2024-01-22T14:30:00Z"
        },
        confidence_score: 75
      }
    };

    it('should validate a correct style card', () => {
      const result = validateStyleCard(validStyleCard);
      expect(result).toEqual(validStyleCard);
    });

    it('should throw error for invalid input', () => {
      expect(() => validateStyleCard(null)).toThrow('Invalid style card data');
      expect(() => validateStyleCard(undefined)).toThrow('Invalid style card data');
      expect(() => validateStyleCard("string")).toThrow('Invalid style card data');
      expect(() => validateStyleCard(123)).toThrow('Invalid style card data');
    });

    it('should accept valid object structure', () => {
      const result = validateStyleCard(validStyleCard);
      expect(result.tone.formal_casual).toBe(75);
      expect(result.writing_stats.reading_level).toBe("8th grade");
      expect(result.patterns.ps_usage).toBe("often");
      expect(result.meta.confidence_score).toBe(75);
    });
  });

  describe('Integration Test Scenarios', () => {
    it('should handle typical marketing email style', () => {
      const marketingEmails: EmailAnalysisInput[] = [
        {
          subject: "URGENT: 50% Off Ends Tonight!",
          body: "Don't miss out on this incredible deal! Shop now and save big. Limited time only!",
          ctr: 0.15,
          sentAt: "2024-01-20T18:00:00Z"
        }
      ];

      const prompt = createStyleAnalysisPrompt(marketingEmails);
      expect(prompt).toContain('URGENT: 50% Off Ends Tonight!');
      expect(prompt).toContain('Don\'t miss out');
      expect(prompt).toContain('CTR: 0.15');
    });

    it('should handle personal newsletter style', () => {
      const newsletterEmails: EmailAnalysisInput[] = [
        {
          subject: "This week's thoughts on creativity",
          body: `Hello friends,

I've been thinking a lot about creativity lately. Not the flashy, Instagram-worthy kind, but the quiet, daily practice of making something from nothing.

There's beauty in the mundane work of showing up consistently.

What have you been creating lately?

With love,
Jamie`,
          sentAt: "2024-01-18T09:00:00Z"
        }
      ];

      const prompt = createStyleAnalysisPrompt(newsletterEmails);
      expect(prompt).toContain('thoughts on creativity');
      expect(prompt).toContain('Hello friends');
      expect(prompt).toContain('With love');
    });
  });
});

// Export for potential use in integration tests
export { sampleEmails };

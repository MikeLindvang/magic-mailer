/**
 * Example usage of the Style Card Builder API
 * 
 * This file demonstrates how to use the style card building functionality
 * both from the client-side and server-side perspectives.
 */

import type { EmailAnalysisInput, StyleCard } from '../prompts/styleCard';

// Example email data for testing
export const sampleEmailData: EmailAnalysisInput[] = [
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
  },
  {
    subject: "This changed everything for me",
    body: `Hey there,

I have to share something with you that completely shifted my perspective last week.

I was having coffee with my mentor, and she asked me a simple question: "What would you do if you knew you couldn't fail?"

It sounds cliche, I know. But something about the way she asked it made me really think.

See, I've been playing it safe for months. Taking the "smart" approach. Doing what everyone else was doing.

But playing it safe is actually the riskiest thing you can do.

So I made a decision. I'm going all-in on the thing that scares me most.

What about you? What would you do if failure wasn't an option?

I'd love to hear your thoughts. Hit reply and let me know.

Until next time,
Alex

P.S. - Fear is just excitement without breath. Remember that.`,
    ctr: 0.28,
    rpc: 19.25,
    sentAt: "2024-01-29T11:15:00Z"
  }
];

/**
 * Client-side usage example
 * Call this from a React component or client-side script
 */
export async function buildStyleCardFromClient(emails: EmailAnalysisInput[]): Promise<string | null> {
  try {
    const response = await fetch('/api/style/build', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emails }),
    });

    const result = await response.json();
    
    if (result.ok) {
      console.log('Style card built successfully!');
      console.log('Style Profile ID:', result.data.style_profile_id);
      return result.data.style_profile_id;
    } else {
      console.error('Error building style card:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Network error:', error);
    return null;
  }
}

/**
 * React Hook example for building style cards
 */
export function useStyleCardBuilder() {
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildStyleCard = async (emails: EmailAnalysisInput[]) => {
    setIsBuilding(true);
    setError(null);

    try {
      const styleProfileId = await buildStyleCardFromClient(emails);
      
      if (styleProfileId) {
        return styleProfileId;
      } else {
        throw new Error('Failed to build style card');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsBuilding(false);
    }
  };

  return {
    buildStyleCard,
    isBuilding,
    error,
  };
}

/**
 * Server-side usage example
 * Call this from a server action or API route
 */
export async function buildStyleCardFromServer(
  userId: string,
  emails: EmailAnalysisInput[]
): Promise<string | null> {
  try {
    // This would be called from within an authenticated server context
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/style/build`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // In a real server context, you'd include auth headers
      },
      body: JSON.stringify({ emails }),
    });

    const result = await response.json();
    
    if (result.ok) {
      return result.data.style_profile_id;
    } else {
      console.error('Server error building style card:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Server network error:', error);
    return null;
  }
}

/**
 * Example of what a complete style card might look like
 * This is the structure returned by the LLM analysis
 */
export const exampleStyleCard: StyleCard = {
  tone: {
    formal_casual: 75,           // Quite casual
    professional_friendly: 80,   // Very friendly
    direct_nurturing: 65,        // Somewhat nurturing
    urgent_relaxed: 45,          // Moderately urgent
    confident_humble: 70         // Confident but approachable
  },
  writing_stats: {
    avg_sentence_length: 15.2,
    avg_paragraph_length: 3.5,
    avg_word_length: 4.8,
    reading_level: "8th grade",
    complexity_score: 45
  },
  patterns: {
    openers: [
      "Hey there",
      "Hi friend", 
      "Hope your week",
      "I was thinking",
      "I have to share"
    ],
    transitions: [
      "Here's the thing",
      "Because here's what I've learned",
      "So let me ask you",
      "But what if I told you",
      "See, I've been"
    ],
    cta_patterns: [
      "Watch the Video Now →",
      "Hit reply and tell me",
      "I'd love to hear your thoughts",
      "[Action Button Text]"
    ],
    closers: [
      "Talk soon,",
      "Cheering you on,",
      "Until next time,",
      "With love,"
    ],
    ps_usage: "often",
    ps_patterns: [
      "P.S. - If you implement this",
      "P.S. - Sometimes the answer",
      "P.S. - Fear is just excitement"
    ]
  },
  habits: {
    emoji_usage: "moderate",
    emoji_types: ["🚀", "👋", "💪", "→"],
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
    high_performing_subjects: [
      "Quick question about your goals...",
      "This changed everything for me"
    ],
    high_performing_openers: [
      "Hi friend",
      "I have to share something"
    ],
    high_performing_ctas: [
      "Hit reply and tell me",
      "I'd love to hear your thoughts"
    ],
    optimal_email_length: "medium",
    best_sending_patterns: [
      "Weekday mornings",
      "Personal stories perform well"
    ]
  },
  meta: {
    total_emails_analyzed: 3,
    date_range: {
      earliest: "2024-01-15T10:00:00Z",
      latest: "2024-01-29T11:15:00Z"
    },
    confidence_score: 85
  }
};

// Add useState import for the hook example
function useState<T>(initialValue: T): [T, (value: T) => void] {
  // This is just for TypeScript - in a real React app, import from 'react'
  return [initialValue, () => {}];
}

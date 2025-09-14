/**
 * Example usage of the Context Guard API
 * 
 * This file demonstrates how to use the context validation endpoint
 * to check factual claims in draft content against context chunks.
 */

// Example request payload
export const exampleRequest = {
  contextChunks: [
    {
      chunkId: 'sales_report_q3',
      md_text: `
# Q3 Sales Report

Our company achieved significant growth in Q3 2024:

- **Total Revenue**: $2.4M (25% increase from Q2)
- **New Customers**: 1,200 (30% increase from Q2)  
- **Customer Retention**: 89%
- **Product Launch**: New AI features launched in September
- **Market Expansion**: Entered 3 new geographic markets

The growth was primarily driven by the successful launch of our AI-powered features and expansion into new markets.
      `
    },
    {
      chunkId: 'customer_feedback_survey',
      md_text: `
# Customer Satisfaction Survey Results - Q3 2024

**Survey Period**: September 15-30, 2024
**Respondents**: 850 customers
**Response Rate**: 34%

## Key Findings

- **Overall Satisfaction**: 87% (up from 82% in Q2)
- **Product Quality Rating**: 4.3/5.0
- **Customer Support Rating**: 4.1/5.0
- **Likelihood to Recommend**: 78% (Net Promoter Score: +42)

## Feature Feedback

- **AI Features**: 92% found them "very useful" or "extremely useful"
- **User Interface**: 85% satisfaction rate
- **Performance**: 79% reported "significant improvement"

## Comments

"The new AI features have transformed how we work with the platform." - Enterprise Customer

"Much faster and more intuitive than before." - SMB Customer
      `
    },
    {
      chunkId: 'competitive_analysis',
      md_text: `
# Competitive Analysis - Q3 2024

## Market Position

Our analysis shows strong competitive positioning:

- **Market Share**: 12% in our primary segment (up from 9% in Q2)
- **Feature Comparison**: Leading in 7 out of 10 key features
- **Pricing Position**: 15% below average competitor pricing
- **Customer Acquisition Cost**: $180 (industry average: $240)

## Competitor Benchmarking

Compared to top 3 competitors:
- **Feature Completeness**: 95% (vs. 87% average)
- **Performance**: 23% faster processing times
- **Customer Support**: 4.1/5.0 rating (vs. 3.6/5.0 average)
      `
    }
  ],
  draft: {
    md: `
# Incredible Q3 Results!

We're thrilled to announce our best quarter yet! Here are the highlights:

## 🚀 Explosive Growth
- **Revenue skyrocketed 25%** compared to last quarter
- **Customer base expanded by 30%** with 1,200 new customers
- **Market share jumped to 12%** in our primary segment

## 🎯 Customer Love
- **87% customer satisfaction** - our highest score ever!
- **92% of customers love our new AI features**
- Customers say we're **23% faster than competitors**

## 🏆 Market Leadership
- **Leading in 7 out of 10 key features** vs. competitors
- **15% more affordable** than the competition
- **#1 customer support rating** in the industry at 4.1/5.0

## 🌟 What Customers Are Saying

"The new AI features have completely revolutionized our workflow and saved us countless hours!"

"This platform is incredibly fast and intuitive - miles ahead of anything else we've tried."

Our success is driven by our amazing team and loyal customers. Here's to an even better Q4! 🎉

*Ready to experience the difference? Join over 10,000 satisfied customers today!*
    `,
    html: `
<h1>Incredible Q3 Results!</h1>

<p>We're thrilled to announce our best quarter yet! Here are the highlights:</p>

<h2>🚀 Explosive Growth</h2>
<ul>
  <li><strong>Revenue skyrocketed 25%</strong> compared to last quarter</li>
  <li><strong>Customer base expanded by 30%</strong> with 1,200 new customers</li>
  <li><strong>Market share jumped to 12%</strong> in our primary segment</li>
</ul>

<h2>🎯 Customer Love</h2>
<ul>
  <li><strong>87% customer satisfaction</strong> - our highest score ever!</li>
  <li><strong>92% of customers love our new AI features</strong></li>
  <li>Customers say we're <strong>23% faster than competitors</strong></li>
</ul>

<h2>🏆 Market Leadership</h2>
<ul>
  <li><strong>Leading in 7 out of 10 key features</strong> vs. competitors</li>
  <li><strong>15% more affordable</strong> than the competition</li>
  <li><strong>#1 customer support rating</strong> in the industry at 4.1/5.0</li>
</ul>

<h2>🌟 What Customers Are Saying</h2>

<blockquote>
  <p>"The new AI features have completely revolutionized our workflow and saved us countless hours!"</p>
</blockquote>

<blockquote>
  <p>"This platform is incredibly fast and intuitive - miles ahead of anything else we've tried."</p>
</blockquote>

<p>Our success is driven by our amazing team and loyal customers. Here's to an even better Q4! 🎉</p>

<p><em>Ready to experience the difference? Join over 10,000 satisfied customers today!</em></p>
    `
  }
};

// Expected response structure
export const expectedResponse = {
  ok: true,
  data: {
    claims: [
      {
        claim: "Revenue skyrocketed 25% compared to last quarter",
        status: "supported",
        supporting_chunks: ["sales_report_q3"],
        evidence: "Sales report explicitly states 25% increase from Q2",
        confidence: 0.98
      },
      {
        claim: "Customer base expanded by 30% with 1,200 new customers", 
        status: "supported",
        supporting_chunks: ["sales_report_q3"],
        evidence: "Sales report confirms 1,200 new customers with 30% increase from Q2",
        confidence: 0.97
      },
      {
        claim: "Market share jumped to 12% in our primary segment",
        status: "supported", 
        supporting_chunks: ["competitive_analysis"],
        evidence: "Competitive analysis shows 12% market share in primary segment",
        confidence: 0.95
      },
      {
        claim: "87% customer satisfaction - our highest score ever",
        status: "supported",
        supporting_chunks: ["customer_feedback_survey"],
        evidence: "Survey results show 87% overall satisfaction, up from 82% in Q2",
        confidence: 0.96
      },
      {
        claim: "92% of customers love our new AI features",
        status: "supported",
        supporting_chunks: ["customer_feedback_survey"], 
        evidence: "Survey shows 92% found AI features very or extremely useful",
        confidence: 0.94
      },
      {
        claim: "23% faster than competitors",
        status: "supported",
        supporting_chunks: ["competitive_analysis"],
        evidence: "Competitive analysis confirms 23% faster processing times",
        confidence: 0.93
      },
      {
        claim: "Leading in 7 out of 10 key features vs. competitors",
        status: "supported",
        supporting_chunks: ["competitive_analysis"],
        evidence: "Competitive analysis explicitly states leading in 7 out of 10 key features",
        confidence: 0.98
      },
      {
        claim: "15% more affordable than the competition",
        status: "supported", 
        supporting_chunks: ["competitive_analysis"],
        evidence: "Analysis shows 15% below average competitor pricing",
        confidence: 0.96
      },
      {
        claim: "#1 customer support rating in the industry at 4.1/5.0",
        status: "supported",
        supporting_chunks: ["customer_feedback_survey", "competitive_analysis"],
        evidence: "Survey shows 4.1/5.0 rating, competitive analysis confirms this beats 3.6/5.0 average",
        confidence: 0.92
      },
      {
        claim: "Join over 10,000 satisfied customers today",
        status: "unsupported",
        supporting_chunks: [],
        evidence: "No context chunks provide information about total customer count of 10,000",
        confidence: 0.85
      }
    ],
    summary: {
      total_claims: 10,
      supported_claims: 9, 
      unsupported_claims: 1,
      support_percentage: 90
    },
    recommendations: [
      "Remove or provide supporting evidence for the '10,000 customers' claim",
      "Consider adding specific time periods to claims for better context",
      "The customer testimonials appear to be paraphrased - consider using exact quotes from the survey"
    ]
  }
};

// Usage example function
export async function validateDraftContext() {
  try {
    const response = await fetch('/api/guard/context', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(exampleRequest)
    });

    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ Context validation successful!');
      console.log(`📊 Summary: ${result.data.summary.supported_claims}/${result.data.summary.total_claims} claims supported (${result.data.summary.support_percentage}%)`);
      
      // Show unsupported claims
      const unsupported = result.data.claims.filter((claim: { status: string }) => claim.status === 'unsupported');
      if (unsupported.length > 0) {
        console.log('\n⚠️  Unsupported claims:');
        unsupported.forEach((claim: { claim: string; evidence: string }) => {
          console.log(`- "${claim.claim}"`);
          console.log(`  Reason: ${claim.evidence}`);
        });
      }
      
      // Show recommendations
      if (result.data.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        result.data.recommendations.forEach((rec: string) => {
          console.log(`- ${rec}`);
        });
      }
      
      return result.data;
    } else {
      console.error('❌ Validation failed:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
    return null;
  }
}

// Test different scenarios
export const testScenarios = {
  // All claims supported
  perfectMatch: {
    contextChunks: [
      {
        chunkId: 'data1',
        md_text: 'Sales increased by 25% in Q3. Customer satisfaction is at 90%.'
      }
    ],
    draft: {
      md: 'We achieved 25% sales growth and 90% customer satisfaction this quarter.'
    }
  },
  
  // No claims supported  
  noSupport: {
    contextChunks: [
      {
        chunkId: 'data1', 
        md_text: 'Weather was nice today. The office coffee machine is broken.'
      }
    ],
    draft: {
      md: 'Our revolutionary AI increased productivity by 500% and customers love it!'
    }
  },
  
  // Mixed support
  partialSupport: {
    contextChunks: [
      {
        chunkId: 'data1',
        md_text: 'Q3 revenue was $1M. Customer count reached 500.'
      }
    ],
    draft: {
      md: 'We hit $1M revenue with 500 customers and became the market leader with 50% market share!'
    }
  }
};

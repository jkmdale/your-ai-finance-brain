
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

export type ClaudeMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type Transaction = {
  description: string;
  amount: number;
  merchant?: string;
  is_income: boolean;
  category?: string;
  date: string;
};

export type FinancialData = {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  transactions: Transaction[];
  goals?: { name: string; current_amount: number; target_amount: number; target_date?: string }[];
};

export type CategorizationResult = {
  category: string;
  confidence: number;
  rationale: string;
};

class ClaudeAIService {
  private async callClaude(messages: ClaudeMessage[], systemPrompt?: string, model = 'claude-3-haiku-20240307'): Promise<string> {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error('User is not logged in');

      const requestBody = {
        input: messages[messages.length - 1].content,
        model,
        system_prompt: systemPrompt || messages[0]?.content || 'You are a helpful financial assistant.',
      };

      console.log('🤖 Claude API Request:', {
        url: `https://gzznuwtxyyaqlbbrxsuz.supabase.co/functions/v1/claude-ai-coach`,
        body: requestBody,
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer [REDACTED]' }
      });

      const response = await fetch(`https://gzznuwtxyyaqlbbrxsuz.supabase.co/functions/v1/claude-ai-coach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('🤖 Claude API Response Status:', response.status, response.statusText);

      const data = await response.json();
      console.log('🤖 Claude API Response Data:', data);

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status} - ${JSON.stringify(data)}`);
      }

      return data?.content?.[0]?.text || data?.response || 'No response';
    } catch (error) {
      console.error('❌ Claude API Error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Return a fallback message instead of throwing
      return 'Claude AI is temporarily unavailable. Please try again later.';
    }
  }

  async getPersonalizedAdvice(data: FinancialData, question: string): Promise<string> {
    const input = `You are a professional financial advisor. Based on this user's financial data: ${JSON.stringify(data)}

User's question: "${question}"

Provide personalized, actionable financial advice. Be encouraging but realistic. Focus on practical steps they can take. Keep response under 300 words.`;

    return await this.callClaude([{ role: 'user', content: input }]);
  }

  async analyzeSpendingPatterns(transactions: Transaction[]): Promise<string> {
    const recent = transactions.slice(0, 20).map(t => ({
      description: t.description,
      amount: Math.round(t.amount / 10) * 10,
      category: t.category || 'Other'
    }));

    const input = `Analyze these spending patterns: ${JSON.stringify(recent)}.

Identify trends and give 3 specific actionable tips. Keep it under 250 words.`;

    return await this.callClaude([{ role: 'user', content: input }]);
  }

  async optimizeGoals(goals: any[], income: number, expenses: number): Promise<string> {
    const surplus = income - expenses;
    const summary = goals.map(g => ({
      name: g.name,
      target: Math.round(g.target_amount),
      current: Math.round(g.current_amount),
      progress: Math.round((g.current_amount / g.target_amount) * 100),
    }));

    const input = `Help optimize these financial goals:\nGoals: ${JSON.stringify(summary)}\nMonthly surplus: $${surplus}

Suggest how to prioritize and accelerate goal achievement. Provide specific allocation recommendations.`;

    return await this.callClaude([{ role: 'user', content: input }]);
  }

  async generateSmartBudgetRecommendations(profile: FinancialData): Promise<{
    recommendations: string;
    suggestedGoals: { name: string; target_amount: number; rationale: string; priority: 'high' | 'medium' | 'low' }[];
  }> {
    const input = `Based on this financial data: ${JSON.stringify(profile)}

Provide:
1. Budget optimization recommendations
2. 3 SMART financial goals with specific amounts and rationale

Format as JSON:
{
  "recommendations": "budget advice text",
  "suggestedGoals": [
    {
      "name": "goal name",
      "target_amount": amount,
      "rationale": "why this goal",
      "priority": "high/medium/low"
    }
  ]
}`;

    const raw = await this.callClaude([{ role: 'user', content: input }]);
    return JSON.parse(raw);
  }

  async calculateFinancialHealthScore(profile: FinancialData): Promise<{ score: number; analysis: string }> {
    const input = `Calculate a financial health score (0-100) based on: ${JSON.stringify(profile)}

Provide the score and a brief analysis. Format: "Score: XX - Analysis..."`;

    const result = await this.callClaude([{ role: 'user', content: input }]);
    const match = result.match(/Score:\s*(\d+)/);
    return {
      score: match ? parseInt(match[1]) : 50,
      analysis: result
    };
  }
}

export const claudeAIService = new ClaudeAIService();
export { ClaudeAIService };

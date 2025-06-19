
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { message, type = 'advice' } = await req.json();

    // Get user's financial data
    const { data: transactions } = await supabaseClient
      .from('transactions')
      .select(`
        amount,
        description,
        transaction_date,
        is_income,
        categories(name)
      `)
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .limit(100);

    const { data: goals } = await supabaseClient
      .from('financial_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    const { data: accounts } = await supabaseClient
      .from('bank_accounts')
      .select('balance, account_name')
      .eq('user_id', user.id);

    // Calculate and sanitize financial summary
    const totalBalance = accounts?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;
    const monthlyIncome = transactions?.filter(t => t.is_income).reduce((sum, t) => sum + t.amount, 0) || 0;
    const monthlyExpenses = transactions?.filter(t => !t.is_income).reduce((sum, t) => sum + t.amount, 0) || 0;

    // Round amounts to nearest $100 for privacy
    const roundToNearest100 = (amount: number) => Math.round(amount / 100) * 100;

    const sanitizedData = {
      totalBalance: roundToNearest100(totalBalance),
      monthlyIncome: roundToNearest100(monthlyIncome),
      monthlyExpenses: roundToNearest100(monthlyExpenses),
      savingsRate: Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100),
      goalCount: goals?.length || 0,
      transactionCount: transactions?.length || 0
    };

    let systemPrompt = '';
    let maxTokens = 500;
    let temperature = 0.3;

    switch (type) {
      case 'advice':
        systemPrompt = `You are SmartFinanceAI, a professional financial advisor. Provide personalized, actionable advice based on the user's financial data. Be encouraging but realistic. Focus on practical steps. Keep responses under 300 words.`;
        break;
      case 'analysis':
        systemPrompt = `You are a financial analyst. Analyze spending patterns and identify trends, savings opportunities, and provide 3 specific actionable tips. Keep under 250 words.`;
        break;
      case 'budget':
        systemPrompt = `You are a budget optimization expert. Create budget recommendations using the 50/30/20 rule as a baseline. Suggest percentage allocations and identify areas to reduce spending. Keep under 300 words.`;
        break;
      case 'goals':
        systemPrompt = `You are a goal optimization specialist. Help prioritize and accelerate financial goal achievement. Provide specific allocation recommendations. Keep under 300 words.`;
        break;
      default:
        systemPrompt = `You are a helpful financial assistant. Provide clear, actionable financial guidance.`;
    }

    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: `${systemPrompt}

Financial Summary: ${JSON.stringify(sanitizedData)}

User's question: "${message}"

Provide helpful, personalized advice based on this data.`
      }
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: maxTokens,
        temperature,
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data: ClaudeResponse = await response.json();
    const aiResponse = data.content[0]?.text || 'Unable to generate response';

    return new Response(JSON.stringify({ 
      response: aiResponse,
      tokenUsage: data.usage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in Claude AI coach function:', error);
    
    // Fallback response
    const fallbackResponse = "I'm experiencing technical difficulties right now. For immediate financial guidance, consider reviewing your spending categories and focusing on building an emergency fund if you haven't already.";
    
    return new Response(JSON.stringify({ 
      response: fallbackResponse,
      error: 'AI service temporarily unavailable'
    }), {
      status: 200, // Don't fail the request, provide fallback
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});


import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Get comprehensive user's financial data
    const { data: transactions } = await supabaseClient
      .from('transactions')
      .select(`
        amount,
        description,
        transaction_date,
        is_income,
        merchant,
        categories(name, is_income)
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
      .select('balance, account_name, bank_name')
      .eq('user_id', user.id);

    const { data: budgets } = await supabaseClient
      .from('budgets')
      .select(`
        *,
        budget_categories(
          allocated_amount,
          spent_amount,
          categories(name)
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true);

    // Calculate detailed financial summary
    const totalBalance = accounts?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;
    
    // Calculate monthly income and expenses from recent transactions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentTransactions = transactions?.filter(t => 
      new Date(t.transaction_date) >= thirtyDaysAgo
    ) || [];

    const monthlyIncome = recentTransactions
      .filter(t => t.is_income)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const monthlyExpenses = recentTransactions
      .filter(t => !t.is_income)
      .reduce((sum, t) => sum + t.amount, 0);

    // Categorize expenses with detailed breakdown
    const expensesByCategory: Record<string, { total: number; transactions: number }> = {};
    recentTransactions?.filter(t => !t.is_income).forEach(t => {
      const category = t.categories?.name || 'Other';
      if (!expensesByCategory[category]) {
        expensesByCategory[category] = { total: 0, transactions: 0 };
      }
      expensesByCategory[category].total += t.amount;
      expensesByCategory[category].transactions += 1;
    });

    // Top merchants analysis
    const merchantSpending: Record<string, number> = {};
    recentTransactions?.filter(t => !t.is_income && t.merchant).forEach(t => {
      const merchant = t.merchant!;
      merchantSpending[merchant] = (merchantSpending[merchant] || 0) + t.amount;
    });

    const topMerchants = Object.entries(merchantSpending)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([merchant, amount]) => ({ merchant, amount }));

    // Budget analysis
    const budgetAnalysis = budgets?.[0] ? {
      totalAllocated: budgets[0].budget_categories?.reduce((sum: number, bc: any) => sum + (bc.allocated_amount || 0), 0) || 0,
      totalSpent: budgets[0].budget_categories?.reduce((sum: number, bc: any) => sum + (bc.spent_amount || 0), 0) || 0,
      categories: budgets[0].budget_categories?.map((bc: any) => ({
        name: bc.categories?.name || 'Unknown',
        allocated: bc.allocated_amount || 0,
        spent: bc.spent_amount || 0,
        remaining: (bc.allocated_amount || 0) - (bc.spent_amount || 0)
      })) || []
    } : null;

    const financialContext = `
COMPREHENSIVE FINANCIAL PROFILE:

ACCOUNT OVERVIEW:
- Total Balance: $${totalBalance.toLocaleString()}
- Active Accounts: ${accounts?.length || 0}
- Account Details: ${accounts?.map(a => `${a.bank_name} ${a.account_name}: $${a.balance?.toLocaleString()}`).join(', ') || 'None'}

MONTHLY CASH FLOW (Last 30 Days):
- Monthly Income: $${monthlyIncome.toLocaleString()}
- Monthly Expenses: $${monthlyExpenses.toLocaleString()}
- Net Monthly Flow: $${(monthlyIncome - monthlyExpenses).toLocaleString()}
- Savings Rate: ${monthlyIncome > 0 ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100) : 0}%

SPENDING BREAKDOWN BY CATEGORY:
${Object.entries(expensesByCategory)
  .sort(([,a], [,b]) => b.total - a.total)
  .map(([cat, data]) => `- ${cat}: $${data.total.toLocaleString()} (${data.transactions} transactions, avg $${Math.round(data.total/data.transactions)})`)
  .join('\n')}

TOP MERCHANTS:
${topMerchants.map(m => `- ${m.merchant}: $${m.amount.toLocaleString()}`).join('\n')}

BUDGET STATUS:
${budgetAnalysis ? `
- Total Budget: $${budgetAnalysis.totalAllocated.toLocaleString()}
- Total Spent: $${budgetAnalysis.totalSpent.toLocaleString()}
- Budget Remaining: $${(budgetAnalysis.totalAllocated - budgetAnalysis.totalSpent).toLocaleString()}
- Budget Utilization: ${budgetAnalysis.totalAllocated > 0 ? Math.round((budgetAnalysis.totalSpent / budgetAnalysis.totalAllocated) * 100) : 0}%

Budget Categories:
${budgetAnalysis.categories.map(c => 
  `- ${c.name}: $${c.spent}/$${c.allocated} (${c.remaining >= 0 ? `$${c.remaining} remaining` : `$${Math.abs(c.remaining)} over budget`})`
).join('\n')}` : 'No active budget set up'}

FINANCIAL GOALS:
${goals?.map(g => {
  const progress = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0;
  const remaining = g.target_amount - g.current_amount;
  const monthsToTarget = g.target_date ? Math.ceil((new Date(g.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30)) : 'No deadline';
  return `- ${g.name} (${g.goal_type}): $${g.current_amount.toLocaleString()}/$${g.target_amount.toLocaleString()} (${progress}% complete, $${remaining.toLocaleString()} remaining, Target: ${monthsToTarget} months)`;
}).join('\n') || 'No active goals'}

RECENT TRANSACTION PATTERNS (Last 20):
${transactions?.slice(0, 20).map(t => 
  `${t.transaction_date}: ${t.description}${t.merchant ? ` (${t.merchant})` : ''} - ${t.is_income ? '+' : '-'}$${t.amount.toLocaleString()} [${t.categories?.name || 'Uncategorized'}]`
).join('\n') || 'No recent transactions'}
`;

    let systemPrompt = '';
    let maxTokens = 600;
    let temperature = 0.7;

    switch (type) {
      case 'advice':
        systemPrompt = `You are SmartFinanceAI, a professional financial advisor and coach. Provide personalized, actionable advice based on the user's comprehensive financial data. Be encouraging but realistic. Focus on practical steps they can take immediately. Reference specific numbers from their data to make advice concrete and actionable.`;
        break;
      case 'analysis':
        systemPrompt = `You are a financial analyst specializing in transaction analysis. Analyze the user's spending patterns and identify trends, potential savings opportunities, unusual transactions, and provide 3-5 specific actionable recommendations. Use their actual data to provide concrete insights.`;
        maxTokens = 500;
        temperature = 0.3;
        break;
      case 'budget':
        systemPrompt = `You are a budget optimization expert. Create specific budget recommendations based on their actual spending patterns. Suggest realistic percentage allocations, identify overspending areas, and provide actionable steps to optimize their budget using their real financial data.`;
        break;
      case 'goals':
        systemPrompt = `You are a goal optimization specialist. Help prioritize and accelerate their specific financial goal achievement. Provide concrete allocation recommendations based on their current cash flow and suggest timeline adjustments using their actual financial data.`;
        break;
      default:
        systemPrompt = `You are a helpful financial assistant with access to comprehensive financial data. Provide clear, actionable financial guidance based on their actual financial situation.`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Here's my comprehensive financial situation:\n\n${financialContext}\n\nMy question/request: ${message}`
          }
        ],
        max_tokens: maxTokens,
        temperature: temperature
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'Unable to generate response';

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in AI coach function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

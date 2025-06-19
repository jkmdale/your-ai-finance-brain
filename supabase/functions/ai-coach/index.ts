
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

    const { message } = await req.json();

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
      .limit(50);

    const { data: goals } = await supabaseClient
      .from('financial_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    const { data: accounts } = await supabaseClient
      .from('bank_accounts')
      .select('balance, account_name')
      .eq('user_id', user.id);

    // Calculate financial summary
    const totalBalance = accounts?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;
    const monthlyIncome = transactions?.filter(t => t.is_income).reduce((sum, t) => sum + t.amount, 0) || 0;
    const monthlyExpenses = transactions?.filter(t => !t.is_income).reduce((sum, t) => sum + t.amount, 0) || 0;

    // Categorize expenses
    const expensesByCategory: Record<string, number> = {};
    transactions?.filter(t => !t.is_income).forEach(t => {
      const category = t.categories?.name || 'Other';
      expensesByCategory[category] = (expensesByCategory[category] || 0) + t.amount;
    });

    const financialContext = `
Financial Summary:
- Total Balance: $${totalBalance.toLocaleString()}
- Monthly Income: $${monthlyIncome.toLocaleString()}
- Monthly Expenses: $${monthlyExpenses.toLocaleString()}
- Net Monthly: $${(monthlyIncome - monthlyExpenses).toLocaleString()}

Top Expense Categories:
${Object.entries(expensesByCategory)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 5)
  .map(([cat, amount]) => `- ${cat}: $${amount.toLocaleString()}`)
  .join('\n')}

Active Goals:
${goals?.map(g => `- ${g.name}: $${g.current_amount}/$${g.target_amount} (${Math.round((g.current_amount/g.target_amount)*100)}% complete)`).join('\n') || 'No active goals'}

Recent Transactions (last 10):
${transactions?.slice(0, 10).map(t => 
  `- ${t.transaction_date}: ${t.description} - ${t.is_income ? '+' : '-'}$${t.amount}`
).join('\n') || 'No recent transactions'}
`;

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
            content: `You are SmartFinanceAI, a professional financial advisor and coach. You provide personalized, actionable financial advice based on the user's actual financial data. 

Key principles:
- Be encouraging but realistic
- Provide specific, actionable recommendations
- Focus on practical steps they can take
- Use their actual financial data to give personalized advice
- Be supportive of their financial goals
- Suggest concrete budgeting and saving strategies
- Highlight both positive trends and areas for improvement

Always format your responses in a friendly, conversational tone while maintaining professionalism.`
          },
          {
            role: 'user',
            content: `Here's my current financial situation:\n\n${financialContext}\n\nMy question: ${message}`
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      }),
    });

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

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

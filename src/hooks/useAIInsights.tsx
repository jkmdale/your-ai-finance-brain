import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAIInsights = () => {
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [processingInsights, setProcessingInsights] = useState(false);

  const generateAIInsights = async (transactions: any[]) => {
    if (!transactions.length || processingInsights) return;

    setProcessingInsights(true);
    try {
      console.log('🤖 Generating AI insights for dashboard...');
      
      const { data, error } = await supabase.functions.invoke('ai-coach', {
        body: { 
          message: `Analyze these recent transactions and provide 3-4 key financial insights and actionable recommendations: ${JSON.stringify(transactions.map(t => ({
            date: t.transaction_date,
            amount: t.amount,
            description: t.description,
            category: t.categories?.name,
            is_income: t.is_income
          })))}`,
          type: 'dashboard_insights'
        }
      });

      if (error) throw error;

      setAiInsights(data.response);
      console.log('✅ AI insights generated');
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
    } finally {
      setProcessingInsights(false);
    }
  };

  const resetInsights = () => {
    setAiInsights(null);
  };

  return {
    aiInsights,
    processingInsights,
    generateAIInsights,
    resetInsights
  };
};
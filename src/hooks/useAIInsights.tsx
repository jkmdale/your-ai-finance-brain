import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAIInsights = () => {
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [processingInsights, setProcessingInsights] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAIInsights = async (transactions: any[]) => {
    if (!transactions.length || processingInsights) return;

    setProcessingInsights(true);
    setError(null);
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

      setAiInsights(data.response || 'No insights available at this time.');
      console.log('✅ AI insights generated');
    } catch (error: any) {
      console.error('Failed to generate AI insights:', error);
      setError(error.message || 'Failed to generate insights. Please try again.');
      setAiInsights('Unable to generate insights at this time. Please try again later.');
    } finally {
      setProcessingInsights(false);
    }
  };

  const resetInsights = () => {
    setAiInsights(null);
    setError(null);
  };

  return {
    aiInsights,
    processingInsights,
    error,
    generateAIInsights,
    resetInsights
  };
};
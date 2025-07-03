import React from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';

interface AIInsightsCardProps {
  aiInsights: string | null;
  processingInsights: boolean;
}

export const AIInsightsCard = ({ aiInsights, processingInsights }: AIInsightsCardProps) => {
  if (!aiInsights && !processingInsights) return null;

  return (
    <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-2xl p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
          {processingInsights ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <TrendingUp className="w-5 h-5 text-white" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">AI Financial Insights</h3>
          <p className="text-white/60 text-sm">Personalized recommendations based on your spending patterns</p>
        </div>
      </div>
      
      {processingInsights ? (
        <div className="text-white/70">
          <div className="animate-pulse">Analyzing your financial patterns...</div>
        </div>
      ) : (
        <div className="text-white/90 whitespace-pre-line">
          {aiInsights}
        </div>
      )}
    </div>
  );
};
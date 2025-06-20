
import React from 'react';
import { TrendingUp, TrendingDown, Minus, Lightbulb } from 'lucide-react';

interface SpendingInsight {
  category: string;
  monthlyAverage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  isDiscretionary: boolean;
  recommendation?: string;
}

interface SpendingInsightsProps {
  insights: SpendingInsight[];
  totalIncome: number;
}

export const SpendingInsights: React.FC<SpendingInsightsProps> = ({
  insights,
  totalIncome
}) => {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return TrendingUp;
      case 'decreasing': return TrendingDown;
      case 'stable': return Minus;
      default: return Minus;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing': return 'text-red-400';
      case 'decreasing': return 'text-green-400';
      case 'stable': return 'text-white/60';
      default: return 'text-white/60';
    }
  };

  const getCategoryColor = (category: string, isDiscretionary: boolean) => {
    if (isDiscretionary) return 'from-orange-400 to-red-400';
    
    const essentialColors = {
      'MORTGAGE': 'from-blue-400 to-blue-500',
      'GROCERIES': 'from-green-400 to-green-500',
      'POWER': 'from-yellow-400 to-yellow-500',
      'FUEL': 'from-purple-400 to-purple-500',
      'HEALTHCARE': 'from-pink-400 to-pink-500'
    };
    
    return essentialColors[category as keyof typeof essentialColors] || 'from-gray-400 to-gray-500';
  };

  return (
    <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Spending Analysis</h3>
        <div className="text-white/60 text-sm">
          {insights.filter(i => i.isDiscretionary).length} discretionary categories
        </div>
      </div>

      <div className="space-y-4">
        {insights.slice(0, 8).map((insight, index) => {
          const TrendIcon = getTrendIcon(insight.trend);
          const percentageOfIncome = totalIncome > 0 ? (insight.monthlyAverage / totalIncome) * 100 : 0;
          
          return (
            <div key={index} className="backdrop-blur-sm bg-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 bg-gradient-to-r ${getCategoryColor(insight.category, insight.isDiscretionary)} rounded-full`} />
                  <div>
                    <span className="text-white font-medium text-sm">
                      {insight.category.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    {insight.isDiscretionary && (
                      <span className="ml-2 text-xs bg-orange-400/20 text-orange-300 px-2 py-0.5 rounded-full">
                        Discretionary
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendIcon className={`w-4 h-4 ${getTrendColor(insight.trend)}`} />
                  <span className="text-white text-sm font-medium">
                    ${insight.monthlyAverage.toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-white/60 mb-2">
                <span>{percentageOfIncome.toFixed(1)}% of income</span>
                <span>{insight.trend} trend</span>
              </div>
              
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${getCategoryColor(insight.category, insight.isDiscretionary)} transition-all duration-1000`}
                  style={{ width: `${Math.min(percentageOfIncome * 2, 100)}%` }}
                />
              </div>
              
              {insight.recommendation && (
                <div className="mt-3 flex items-start space-x-2">
                  <Lightbulb className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-white/80">{insight.recommendation}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {insights.length > 8 && (
        <div className="mt-4 text-center">
          <button className="text-purple-400 hover:text-purple-300 text-sm font-medium">
            View {insights.length - 8} more categories →
          </button>
        </div>
      )}
    </div>
  );
};

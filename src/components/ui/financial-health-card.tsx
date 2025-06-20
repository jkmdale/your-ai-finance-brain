
import React from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';

interface FinancialHealthMetrics {
  riskLevel: 'HEALTHY' | 'MODERATE_RISK' | 'HIGH_RISK' | 'CRISIS';
  deficitPercentage: number;
  expenseRatio: number;
  discretionaryRatio: number;
  recommendations: string[];
}

interface FinancialHealthCardProps {
  metrics: FinancialHealthMetrics;
  monthlyIncome: number;
  monthlyExpenses: number;
}

export const FinancialHealthCard: React.FC<FinancialHealthCardProps> = ({
  metrics,
  monthlyIncome,
  monthlyExpenses
}) => {
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'HEALTHY': return 'from-green-500 to-emerald-500';
      case 'MODERATE_RISK': return 'from-yellow-500 to-orange-500';
      case 'HIGH_RISK': return 'from-orange-500 to-red-500';
      case 'CRISIS': return 'from-red-500 to-red-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'HEALTHY': return TrendingUp;
      case 'MODERATE_RISK': return Target;
      case 'HIGH_RISK': return TrendingDown;
      case 'CRISIS': return AlertTriangle;
      default: return DollarSign;
    }
  };

  const getRiskText = (riskLevel: string) => {
    switch (riskLevel) {
      case 'HEALTHY': return 'Financially Healthy';
      case 'MODERATE_RISK': return 'Needs Attention';
      case 'HIGH_RISK': return 'High Risk';
      case 'CRISIS': return 'Financial Crisis';
      default: return 'Unknown Status';
    }
  };

  const RiskIcon = getRiskIcon(metrics.riskLevel);

  return (
    <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 bg-gradient-to-br ${getRiskColor(metrics.riskLevel)} rounded-xl flex items-center justify-center`}>
            <RiskIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{getRiskText(metrics.riskLevel)}</h3>
            <p className="text-white/60 text-sm">Financial Health Assessment</p>
          </div>
        </div>
        {metrics.riskLevel === 'CRISIS' && (
          <div className="animate-pulse">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="backdrop-blur-sm bg-white/10 rounded-xl p-4">
          <div className="text-white/60 text-sm mb-1">Expense Ratio</div>
          <div className="text-xl font-bold text-white">{metrics.expenseRatio.toFixed(1)}%</div>
          <div className="text-xs text-white/50">of income</div>
        </div>
        <div className="backdrop-blur-sm bg-white/10 rounded-xl p-4">
          <div className="text-white/60 text-sm mb-1">Discretionary</div>
          <div className="text-xl font-bold text-white">{metrics.discretionaryRatio.toFixed(1)}%</div>
          <div className="text-xs text-white/50">of income</div>
        </div>
      </div>

      {/* Balance Display */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/70 text-sm">Monthly Balance</span>
          <span className={`text-lg font-bold ${monthlyIncome - monthlyExpenses >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${Math.abs(monthlyIncome - monthlyExpenses).toLocaleString()}
            {monthlyIncome - monthlyExpenses < 0 && ' deficit'}
          </span>
        </div>
        <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
          <div 
            className={`h-full ${monthlyIncome - monthlyExpenses >= 0 ? 'bg-green-400' : 'bg-red-400'} transition-all duration-1000`}
            style={{ width: `${Math.min(Math.abs(metrics.expenseRatio), 100)}%` }}
          />
        </div>
      </div>

      {/* Recommendations */}
      {metrics.recommendations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-white font-medium text-sm mb-3">Key Insights</h4>
          {metrics.recommendations.slice(0, 3).map((recommendation, index) => (
            <div key={index} className="flex items-start space-x-2 text-sm">
              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
              <span className="text-white/80">{recommendation}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

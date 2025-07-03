import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, ArrowUpDown, RefreshCw } from 'lucide-react';
import type { MonthlyClassification } from '@/utils/transactionClassifier';

interface TransactionSummaryProps {
  summary: MonthlyClassification;
}

export const TransactionSummary: React.FC<TransactionSummaryProps> = ({ summary }) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
    }).format(amount);
  };

  const getSavingsRateColor = (rate: number): string => {
    if (rate >= 20) return 'text-green-400';
    if (rate >= 10) return 'text-yellow-400';
    if (rate >= 0) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Main Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/10 border-white/20 backdrop-blur-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/70 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-green-400" />
              Monthly Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(summary.income)}
            </div>
            <p className="text-xs text-white/60 mt-1">
              {summary.incomeTransactions.length} transactions
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/10 border-white/20 backdrop-blur-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/70 flex items-center">
              <TrendingDown className="w-4 h-4 mr-2 text-red-400" />
              Monthly Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(summary.expenses)}
            </div>
            <p className="text-xs text-white/60 mt-1">
              {summary.expenseTransactions.length} transactions
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/10 border-white/20 backdrop-blur-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/70">
              Savings Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getSavingsRateColor(summary.savingsRate)}`}>
              {summary.savingsRate.toFixed(1)}%
            </div>
            <p className="text-xs text-white/60 mt-1">
              Balance: {formatCurrency(summary.balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Classification Summary */}
      <Card className="bg-white/10 border-white/20 backdrop-blur-lg">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <ArrowUpDown className="w-5 h-5 mr-2" />
            Transaction Classification Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xl font-semibold text-green-400">
                {summary.incomeTransactions.length}
              </div>
              <div className="text-sm text-white/70">Income</div>
              <Badge variant="outline" className="text-xs mt-1 border-green-400/50 text-green-400">
                Valid
              </Badge>
            </div>
            
            <div className="text-center">
              <div className="text-xl font-semibold text-red-400">
                {summary.expenseTransactions.length}
              </div>
              <div className="text-sm text-white/70">Expenses</div>
              <Badge variant="outline" className="text-xs mt-1 border-red-400/50 text-red-400">
                Valid
              </Badge>
            </div>
            
            <div className="text-center">
              <div className="text-xl font-semibold text-blue-400">
                {summary.transferTransactions.length}
              </div>
              <div className="text-sm text-white/70">Transfers</div>
              <Badge variant="outline" className="text-xs mt-1 border-blue-400/50 text-blue-400">
                Excluded
              </Badge>
            </div>
            
            <div className="text-center">
              <div className="text-xl font-semibold text-orange-400">
                {summary.reversalTransactions.length}
              </div>
              <div className="text-sm text-white/70">Reversals</div>
              <Badge variant="outline" className="text-xs mt-1 border-orange-400/50 text-orange-400">
                Excluded
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Month Info */}
      <Card className="bg-white/10 border-white/20 backdrop-blur-lg">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-medium">Analysis Period</h3>
              <p className="text-white/70 text-sm">
                {new Date(summary.month + '-01').toLocaleDateString('en-NZ', { 
                  year: 'numeric', 
                  month: 'long' 
                })}
              </p>
            </div>
            <div className="text-right">
              <div className="text-white font-medium">{summary.transactionCount}</div>
              <div className="text-white/70 text-sm">valid transactions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Health Indicator */}
      {summary.savingsRate < 0 && (
        <Card className="bg-red-500/20 border-red-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-5 h-5 text-red-400" />
              <div>
                <h4 className="text-red-300 font-medium">Spending Alert</h4>
                <p className="text-red-300/80 text-sm">
                  You're spending {formatCurrency(Math.abs(summary.balance))} more than you earn this month.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
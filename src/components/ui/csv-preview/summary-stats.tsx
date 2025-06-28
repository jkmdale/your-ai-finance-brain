
import React from 'react';

interface SummaryStatsProps {
  summary: {
    totalTransactions: number;
    successRate: number;
    totalAmount: number;
    dateRange: { start: string; end: string };
  };
  skippedRowsCount: number;
}

export const SummaryStats: React.FC<SummaryStatsProps> = ({ summary, skippedRowsCount }) => {
  return (
    <div className="bg-white/10 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">CSV Processing Preview</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">{summary.totalTransactions}</div>
          <div className="text-white/60 text-sm">Will Process</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-400">{skippedRowsCount}</div>
          <div className="text-white/60 text-sm">Will Skip</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{summary.successRate.toFixed(0)}%</div>
          <div className="text-white/60 text-sm">Success Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400">
            ${Math.abs(summary.totalAmount).toLocaleString()}
          </div>
          <div className="text-white/60 text-sm">Net Amount</div>
        </div>
      </div>

      {summary.dateRange.start && (
        <div className="text-center text-white/70 text-sm">
          Date range: {summary.dateRange.start} to {summary.dateRange.end}
        </div>
      )}
    </div>
  );
};

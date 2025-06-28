import React from 'react';
import { CheckCircle, AlertTriangle, X, Info } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
import { Badge } from './badge';
import { ProcessedCSV, SkippedRow } from '@/utils/csv/types';

interface CSVPreviewProps {
  processedData: ProcessedCSV;
  onConfirm: () => void;
  onCancel: () => void;
}

export const CSVPreview: React.FC<CSVPreviewProps> = ({ processedData, onConfirm, onCancel }) => {
  const { transactions, skippedRows, summary, warnings, errors } = processedData;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-500/20 text-green-300';
    if (confidence >= 0.7) return 'bg-yellow-500/20 text-yellow-300';
    return 'bg-red-500/20 text-red-300';
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="bg-white/10 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">CSV Processing Preview</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{summary.totalTransactions}</div>
            <div className="text-white/60 text-sm">Will Process</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{skippedRows.length}</div>
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

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <X className="w-5 h-5 text-red-400" />
            <h4 className="text-red-300 font-medium">Errors</h4>
          </div>
          <ul className="text-red-300 text-sm space-y-1">
            {errors.map((error, i) => (
              <li key={i}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h4 className="text-yellow-300 font-medium">Warnings ({warnings.length})</h4>
          </div>
          <div className="max-h-32 overflow-y-auto">
            <ul className="text-yellow-300 text-sm space-y-1">
              {warnings.slice(0, 10).map((warning, i) => (
                <li key={i}>• {warning}</li>
              ))}
              {warnings.length > 10 && (
                <li className="text-yellow-400 font-medium">... and {warnings.length - 10} more</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Skipped Rows */}
      {skippedRows.length > 0 && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h4 className="text-red-300 font-medium">Skipped Rows ({skippedRows.length})</h4>
          </div>
          
          <div className="max-h-48 overflow-y-auto space-y-2">
            {skippedRows.slice(0, 20).map((skipped, index) => (
              <div key={index} className="bg-red-500/10 rounded p-2 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-red-300 font-medium">Row {skipped.rowNumber}</span>
                  <Badge variant="outline" className="text-red-400 border-red-400">
                    {skipped.reason}
                  </Badge>
                </div>
                
                {skipped.data.length > 0 && (
                  <div className="text-white/60 text-xs mb-1">
                    Data: {skipped.data.slice(0, 3).map(d => `"${d}"`).join(', ')}
                    {skipped.data.length > 3 && ` (+${skipped.data.length - 3} more)`}
                  </div>
                )}
                
                {skipped.suggestions && skipped.suggestions.length > 0 && (
                  <div className="text-yellow-300 text-xs">
                    💡 {skipped.suggestions[0]}
                  </div>
                )}
              </div>
            ))}
            
            {skippedRows.length > 20 && (
              <div className="text-red-300 text-sm font-medium text-center py-2">
                ... and {skippedRows.length - 20} more skipped rows
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transaction Preview */}
      {transactions.length > 0 && (
        <div className="bg-white/10 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h4 className="text-white font-medium">Transaction Preview (showing first 10)</h4>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/20">
                  <TableHead className="text-white/70">Row</TableHead>
                  <TableHead className="text-white/70">Date</TableHead>
                  <TableHead className="text-white/70">Description</TableHead>
                  <TableHead className="text-white/70">Amount</TableHead>
                  <TableHead className="text-white/70">Category</TableHead>
                  <TableHead className="text-white/70">Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.slice(0, 10).map((transaction, index) => (
                  <TableRow key={index} className="border-white/10">
                    <TableCell className="text-white/60 text-sm">
                      {transaction.rowNumber}
                    </TableCell>
                    <TableCell className="text-white/80 text-sm">
                      {new Date(transaction.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-white/80 text-sm max-w-48 truncate">
                      {transaction.description}
                    </TableCell>
                    <TableCell className={`text-sm font-medium ${
                      transaction.isIncome ? 'text-green-400' : 'text-white'
                    }`}>
                      {transaction.isIncome ? '+' : '-'}${transaction.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        transaction.isIncome ? 'text-green-300 border-green-300' : 'text-purple-300 border-purple-300'
                      }>
                        {transaction.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getConfidenceColor(transaction.confidence)}>
                        {Math.round(transaction.confidence * 100)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {transactions.length > 10 && (
            <div className="text-white/60 text-sm text-center mt-2">
              ... and {transactions.length - 10} more transactions
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={onConfirm}
          disabled={transactions.length === 0}
          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {transactions.length === 0 ? 'No Transactions to Process' : `Process ${transactions.length} Transactions`}
        </button>
        
        <button
          onClick={onCancel}
          className="px-6 py-3 border border-white/30 text-white rounded-lg hover:bg-white/10 transition-all duration-200"
        >
          Cancel
        </button>
      </div>

      {/* Processing Tips */}
      <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Info className="w-5 h-5 text-blue-400" />
          <h4 className="text-blue-300 font-medium">Tips for Better Results</h4>
        </div>
        <ul className="text-blue-200 text-sm space-y-1">
          <li>• Remove empty rows and ensure data is aligned with column headers</li>
          <li>• Use consistent date formats (DD/MM/YYYY or YYYY-MM-DD work best)</li>
          <li>• Include currency symbols or use consistent decimal separators</li>
          <li>• Provide detailed transaction descriptions for better categorization</li>
        </ul>
      </div>
    </div>
  );
};

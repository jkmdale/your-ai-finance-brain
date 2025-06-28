
import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../table';
import { Badge } from '../badge';
import { Transaction } from '@/utils/csv/types';

interface TransactionPreviewProps {
  transactions: Transaction[];
}

export const TransactionPreview: React.FC<TransactionPreviewProps> = ({ transactions }) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-500/20 text-green-300';
    if (confidence >= 0.7) return 'bg-yellow-500/20 text-yellow-300';
    return 'bg-red-500/20 text-red-300';
  };

  if (transactions.length === 0) return null;

  return (
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
  );
};

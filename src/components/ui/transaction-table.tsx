
import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  is_income: boolean;
  merchant?: string;
  categories?: {
    name: string;
    color: string;
  };
}

interface TransactionTableProps {
  transactions: Transaction[];
}

export const TransactionTable: React.FC<TransactionTableProps> = ({ transactions }) => {
  const getCategoryColor = (categoryName?: string) => {
    if (!categoryName) return 'gray';
    const colors: { [key: string]: string } = {
      'Food & Dining': 'red',
      'Income': 'green',
      'Transportation': 'blue',
      'Housing': 'purple',
      'Investments': 'orange'
    };
    return colors[categoryName] || 'gray';
  };

  return (
    <div className="overflow-hidden rounded-xl border border-white/20">
      <Table>
        <TableHeader>
          <TableRow className="border-white/20 hover:bg-white/5">
            <TableHead className="text-white/70 font-medium">Code</TableHead>
            <TableHead className="text-white/70 font-medium">Details</TableHead>
            <TableHead className="text-white/70 font-medium hidden md:table-cell">Category</TableHead>
            <TableHead className="text-white/70 font-medium">Date</TableHead>
            <TableHead className="text-white/70 font-medium text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => {
            const categoryColor = getCategoryColor(transaction.categories?.name);
            
            return (
              <TableRow key={transaction.id} className="border-white/10 hover:bg-white/5">
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      transaction.is_income 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {transaction.is_income ? (
                        <ArrowUp className="w-4 h-4" />
                      ) : (
                        <ArrowDown className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate max-w-[150px]" title={transaction.merchant || 'Unknown Merchant'}>
                        {transaction.merchant || 'Unknown Merchant'}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-white/80 truncate block max-w-[200px]" title={transaction.description}>
                    {transaction.description}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {transaction.categories && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${categoryColor}-500/20 text-${categoryColor}-300`}>
                      {transaction.categories.name}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-white/80 text-sm">
                    {new Date(transaction.transaction_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={`font-semibold ${
                    transaction.is_income ? 'text-green-400' : 'text-white'
                  }`}>
                    {transaction.is_income ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

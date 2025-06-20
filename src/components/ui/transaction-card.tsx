
import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface TransactionCardProps {
  transaction: Transaction;
  className?: string;
}

export const TransactionCard: React.FC<TransactionCardProps> = ({ 
  transaction, 
  className 
}) => {
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

  const categoryColor = getCategoryColor(transaction.categories?.name);

  return (
    <div className={cn(
      "backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-4 hover:bg-white/15 transition-all duration-200",
      className
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            transaction.is_income 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-red-500/20 text-red-400'
          }`}>
            {transaction.is_income ? (
              <ArrowUp className="w-5 h-5" />
            ) : (
              <ArrowDown className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-medium truncate">{transaction.description}</h4>
            <p className="text-white/60 text-sm truncate">{transaction.merchant || 'Unknown Merchant'}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <div className={`text-lg font-semibold ${
            transaction.is_income ? 'text-green-400' : 'text-white'
          }`}>
            {transaction.is_income ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/60">
          {new Date(transaction.transaction_date).toLocaleDateString()}
        </span>
        {transaction.categories && (
          <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${categoryColor}-500/20 text-${categoryColor}-300`}>
            {transaction.categories.name}
          </span>
        )}
      </div>
    </div>
  );
};

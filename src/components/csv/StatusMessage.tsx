
import React from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface StatusMessageProps {
  status: 'idle' | 'success' | 'error' | 'processing' | 'validating' | 'preview';
  message: string;
  analyzing: boolean;
  creatingBudget: boolean;
  recommendingGoals: boolean;
}

export const StatusMessage: React.FC<StatusMessageProps> = ({
  status,
  message,
  analyzing,
  creatingBudget,
  recommendingGoals
}) => {
  if (status === 'idle') return null;

  return (
    <div className={`flex items-start space-x-2 p-4 rounded-lg ${
      status === 'success' 
        ? 'bg-green-500/20 border border-green-500/30' 
        : status === 'processing'
        ? 'bg-blue-500/20 border border-blue-500/30'
        : status === 'validating'
        ? 'bg-purple-500/20 border border-purple-500/30'
        : 'bg-red-500/20 border border-red-500/30'
    }`}>
      {status === 'success' ? (
        <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
      ) : status === 'validating' ? (
        <Loader2 className="w-5 h-5 text-purple-400 animate-spin mt-0.5 flex-shrink-0" />
      ) : status === 'error' ? (
        <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
      ) : (
        <Loader2 className="w-5 h-5 text-blue-400 animate-spin mt-0.5 flex-shrink-0" />
      )}
      <div className="flex-1">
        <span className={`text-sm ${
          status === 'success' ? 'text-green-300' : 
          status === 'validating' ? 'text-purple-300' :
          status === 'error' ? 'text-red-300' :
          'text-blue-300'
        }`}>
          {message}
        </span>
      </div>
    </div>
  );
};

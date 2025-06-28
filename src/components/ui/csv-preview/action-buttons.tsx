
import React from 'react';

interface ActionButtonsProps {
  onConfirm: () => void;
  onCancel: () => void;
  transactionCount: number;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ onConfirm, onCancel, transactionCount }) => {
  return (
    <div className="flex space-x-4">
      <button
        onClick={onConfirm}
        disabled={transactionCount === 0}
        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {transactionCount === 0 ? 'No Transactions to Process' : `Process ${transactionCount} Transactions`}
      </button>
      
      <button
        onClick={onCancel}
        className="px-6 py-3 border border-white/30 text-white rounded-lg hover:bg-white/10 transition-all duration-200"
      >
        Cancel
      </button>
    </div>
  );
};


import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ErrorsWarningsProps {
  errors: string[];
  warnings: string[];
}

export const ErrorsWarnings: React.FC<ErrorsWarningsProps> = ({ errors, warnings }) => {
  return (
    <>
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
    </>
  );
};

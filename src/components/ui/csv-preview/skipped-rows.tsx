
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '../badge';
import { SkippedRow } from '@/utils/csv/types';

interface SkippedRowsProps {
  skippedRows: SkippedRow[];
}

export const SkippedRows: React.FC<SkippedRowsProps> = ({ skippedRows }) => {
  if (skippedRows.length === 0) return null;

  return (
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
  );
};

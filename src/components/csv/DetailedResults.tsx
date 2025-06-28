
import React, { useState } from 'react';
import { Eye } from 'lucide-react';

interface DetailedResultsProps {
  detailedResults: {
    totalParsed: number;
    totalUploaded: number;
    batchResults: Array<{ 
      batchNumber: number; 
      attempted: number; 
      succeeded: number; 
      failed: number; 
      errors: string[] 
    }>;
  };
  skipped: number;
}

export const DetailedResults: React.FC<DetailedResultsProps> = ({
  detailedResults,
  skipped
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="bg-white/10 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-white font-medium">Processing Details</h4>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-white/60 hover:text-white/80 transition-colors"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-3">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">{detailedResults.totalParsed}</div>
          <div className="text-xs text-white/60">Parsed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{detailedResults.totalUploaded}</div>
          <div className="text-xs text-white/60">Uploaded</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-400">{skipped}</div>
          <div className="text-xs text-white/60">Skipped</div>
        </div>
      </div>

      {showDetails && (
        <div className="space-y-2">
          <h5 className="text-white/80 text-sm font-medium">Batch Results:</h5>
          {detailedResults.batchResults.map((batch, index) => (
            <div key={index} className={`p-2 rounded text-xs ${
              batch.failed > 0 ? 'bg-red-500/20' : 'bg-green-500/20'
            }`}>
              <div className="flex justify-between">
                <span className="text-white/80">Batch {batch.batchNumber}</span>
                <span className={batch.failed > 0 ? 'text-red-300' : 'text-green-300'}>
                  {batch.succeeded}/{batch.attempted}
                </span>
              </div>
              {batch.errors.length > 0 && (
                <div className="mt-1 text-red-300">
                  {batch.errors.slice(0, 2).map((error, i) => (
                    <div key={i}>• {error}</div>
                  ))}
                  {batch.errors.length > 2 && <div>...and {batch.errors.length - 2} more</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

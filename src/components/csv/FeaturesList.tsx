
import React from 'react';

export const FeaturesList: React.FC = () => {
  return (
    <div className="bg-white/10 rounded-lg p-4">
      <h4 className="text-white font-medium mb-2">🚀 Enhanced CSV Processing Features:</h4>
      <ul className="text-white/70 text-sm space-y-1">
        <li>• <strong>Comprehensive Processing:</strong> Extract every valid transaction from CSV files</li>
        <li>• <strong>Fault-Tolerant Upload:</strong> Retry failed batches with individual inserts</li>
        <li>• <strong>Detailed Error Reporting:</strong> Row-by-row error tracking with suggestions</li>
        <li>• <strong>Flexible Field Mapping:</strong> Auto-detect Date, Amount, Description columns</li>
        <li>• <strong>Multiple Date Formats:</strong> DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD support</li>
        <li>• <strong>Enhanced Validation:</strong> Skip only truly empty/corrupt rows</li>
        <li>• <strong>Batch Processing:</strong> Efficient upload with detailed batch results</li>
        <li>• <strong>Smart Categorization:</strong> AI-powered transaction categorization</li>
      </ul>
    </div>
  );
};


import React from 'react';
import { Info } from 'lucide-react';

export const ProcessingTips: React.FC = () => {
  return (
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
  );
};

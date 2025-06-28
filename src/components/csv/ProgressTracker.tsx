
import React from 'react';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ProgressTrackerProps {
  progress: number;
  analyzing: boolean;
  creatingBudget: boolean;
  recommendingGoals: boolean;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  progress,
  analyzing,
  creatingBudget,
  recommendingGoals
}) => {
  if (progress === 0) return null;

  return (
    <div className="mt-3">
      <Progress value={progress} className="h-2" />
      <p className="text-white/60 text-xs mt-1 text-center">{progress}% complete</p>
      
      {/* Show processing status */}
      {(analyzing || creatingBudget || recommendingGoals) && (
        <div className="mt-2 space-y-1">
          {analyzing && (
            <div className="flex items-center space-x-2 text-xs text-blue-300">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Analyzing spending patterns...</span>
            </div>
          )}
          {creatingBudget && (
            <div className="flex items-center space-x-2 text-xs text-purple-300">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Creating smart budget...</span>
            </div>
          )}
          {recommendingGoals && (
            <div className="flex items-center space-x-2 text-xs text-green-300">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Generating SMART goals...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

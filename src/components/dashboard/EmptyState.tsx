import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Upload, TrendingUp } from 'lucide-react';
import { CSVUpload } from '@/components/sections/CSVUpload';

interface EmptyStateProps {
  lastDataRefresh: Date | null;
  onRetry?: () => void;
}

export const EmptyState = ({ lastDataRefresh, onRetry }: EmptyStateProps) => {
  return (
    <section className="min-h-screen w-full flex flex-col items-center justify-center p-4 space-y-8">
      {/* Empty State Message */}
      <div className="text-center max-w-md">
        <TrendingUp className="h-24 w-24 text-purple-400 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-white mb-4">
          Ready to Start Your Financial Journey?
        </h2>
        <p className="text-white/70 mb-6">
          Upload your bank statements or transaction data to get started with AI-powered financial insights.
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-2 text-white/60">
            <Upload className="h-5 w-5" />
            <span>Upload CSV files from your bank</span>
          </div>
          
          {onRetry && (
            <Button 
              onClick={onRetry}
              variant="outline"
              className="border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          )}
        </div>
        
        {lastDataRefresh && (
          <p className="text-white/50 text-sm mt-6">
            Last checked: {lastDataRefresh.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* CSV Upload Section - ALWAYS VISIBLE when no data */}
      <div className="w-full max-w-2xl">
        <div className="text-center mb-4">
          <h3 className="text-xl font-bold text-white mb-2">
            📊 Upload CSV Here
          </h3>
          <p className="text-white/70 text-sm">
            DEBUG: Upload box should be visible now - EmptyState component
          </p>
        </div>
        <CSVUpload />
      </div>
    </section>
  );
};
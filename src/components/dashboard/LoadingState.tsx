import React from 'react';

interface LoadingStateProps {
  lastDataRefresh: Date | null;
}

export const LoadingState = ({ lastDataRefresh }: LoadingStateProps) => {
  return (
    <section className="min-h-screen w-full flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white/70">Loading your financial data...</p>
        {lastDataRefresh && (
          <p className="text-white/50 text-sm mt-2">
            Last updated: {lastDataRefresh.toLocaleTimeString()}
          </p>
        )}
      </div>
    </section>
  );
};
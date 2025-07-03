import React from 'react';
import { CSVUpload } from '../sections/CSVUpload';
import { EmptyStateCards } from './EmptyStateCards';

interface EmptyStateProps {
  lastDataRefresh: Date | null;
}

export const EmptyState = ({ lastDataRefresh }: EmptyStateProps) => {
  return (
    <section className="min-h-screen w-full p-4 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Welcome to Your AI-Powered Financial OS
        </h2>
        <p className="text-lg text-white/70">
          Start your intelligent financial journey by uploading your first transaction file
        </p>
        {lastDataRefresh && (
          <p className="text-white/50 text-sm mt-2">
            System ready - Last checked: {lastDataRefresh.toLocaleTimeString()}
          </p>
        )}
      </div>

      <EmptyStateCards />
      <CSVUpload />
    </section>
  );
};
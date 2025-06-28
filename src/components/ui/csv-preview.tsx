
import React from 'react';
import { ProcessedCSV } from '@/utils/csv/types';
import {
  SummaryStats,
  ErrorsWarnings,
  SkippedRows,
  TransactionPreview,
  ActionButtons,
  ProcessingTips
} from './csv-preview';

interface CSVPreviewProps {
  processedData: ProcessedCSV;
  onConfirm: () => void;
  onCancel: () => void;
}

export const CSVPreview: React.FC<CSVPreviewProps> = ({ processedData, onConfirm, onCancel }) => {
  const { transactions, skippedRows, summary, warnings, errors } = processedData;

  return (
    <div className="space-y-6">
      <SummaryStats 
        summary={summary}
        skippedRowsCount={skippedRows.length}
      />

      <ErrorsWarnings 
        errors={errors}
        warnings={warnings}
      />

      <SkippedRows skippedRows={skippedRows} />

      <TransactionPreview transactions={transactions} />

      <ActionButtons
        onConfirm={onConfirm}
        onCancel={onCancel}
        transactionCount={transactions.length}
      />

      <ProcessingTips />
    </div>
  );
};

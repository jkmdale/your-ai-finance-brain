// src/components/Import/ImportCsvTrigger.tsx
import Papa from 'papaparse';
import { handleBulkImport } from '@/modules/import/controller';
import { toast } from 'sonner';

export function ImportCsvTrigger() {
  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    toast.loading('Processing CSV...');

    Papa.parse(file, {
      complete: async (results) => {
        try {
          const rows = results.data as string[][];
          await handleBulkImport(file.name, rows);
          toast.success('Import complete ✅');
        } catch (err) {
          toast.error('Import failed ❌');
        }
      },
      error: () => toast.error('CSV parse error ❌'),
      skipEmptyLines: true
    });
  };

  return (
    <label className="block cursor-pointer rounded-lg border border-dashed p-4 text-center hover:bg-muted">
      <span className="block text-sm font-medium text-muted-foreground">Upload Bank CSV</span>
      <input
        type="file"
        accept=".csv"
        onChange={handleFile}
        className="sr-only"
      />
    </label>
  );
}
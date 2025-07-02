// src/components/Dev/DevStorageInspector.tsx
import { useEffect, useState } from 'react';
import { decryptAndLoadTransactions } from '@/modules/storage/secureStore';
import { clearSecureStore } from '@/utils/clearStore';
import type { Transaction } from '@/types/Transaction';

export function DevStorageInspector() {
  const [data, setData] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const decrypted = await decryptAndLoadTransactions();
    setData(decrypted);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p className="text-muted">Loading local data...</p>;

  return (
    <div className="p-4 rounded-lg border bg-muted text-sm max-h-[400px] overflow-y-auto">
      <h2 className="font-semibold mb-2">🔐 Decrypted Transactions</h2>
      <pre className="whitespace-pre-wrap text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
      <button
        onClick={async () => {
          await clearSecureStore();
          await load();
        }}
        className="mt-2 inline-block rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700"
      >
        Clear Store
      </button>
    </div>
  );
}
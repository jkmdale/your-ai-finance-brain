// src/components/Dev/DevStorageInspector.tsx import { useEffect, useState } from 'react' import { decryptAndLoadTransactions } from '@/modules/storage/secureStore' import type { Transaction } from '@/types/Transaction'

export function DevStorageInspector() { const [data, setData] = useState<Transaction[]>([]) const [loading, setLoading] = useState(true)

useEffect(() => { const fetch = async () => { try { const decrypted = await decryptAndLoadTransactions() setData(decrypted) } finally { setLoading(false) } } fetch() }, [])

if (loading) return <p className="text-muted">Loading local data...</p>

return ( <div className="p-4 rounded-lg border bg-muted text-sm max-h-[300px] overflow-y-auto"> <h2 className="font-semibold mb-2">🔐 Decrypted Transactions</h2> <pre className="whitespace-pre-wrap text-xs"> {JSON.stringify(data, null, 2)} </pre> </div> ) }


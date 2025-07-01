/*
  File: src/types/Transaction.ts
  Description: Shared Transaction type for normalized bank records.
*/

export interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  account: string;
}

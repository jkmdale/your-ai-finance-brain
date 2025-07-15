import { parse as parseDate, isValid as isValidDate } from 'date-fns';

export interface Transaction {
  date: string;
  amount: number;
  isIncome: boolean;
  description: string;
  merchant?: string; // Add merchant field
  originalRow: any; // Add originalRow field
  [key: string]: any;
}
export interface BankFormat {
  columnMappings: {
    date: string[];
    amount: string[];
    debit?: string[];
    credit?: string[];
    description: string[];
    merchant?: string[]; // Add merchant field
  };
  [key: string]: any;
}

export class UnifiedTransactionProcessor {
  constructor(public bankFormat: BankFormat) {}

  parseAmount(value: string): number {
    if (!value) return 0;
    let clean = value.replace(/[$,()\s]/g, '');
    if (clean === '') return 0;
    if (/\(\d+(\.\d+)?\)/.test(value)) {
      clean = '-' + clean.replace(/[()]/g, '');
    }
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  }

  findColumnValue(row: any, columns: string[]): string {
    for (const col of columns) {
      if (row.hasOwnProperty(col)) {
        return (row[col] ?? '').toString().trim();
      }
      const key = Object.keys(row).find(
        k => k.trim().toLowerCase() === col.trim().toLowerCase()
      );
      if (key) return (row[key] ?? '').toString().trim();
    }
    return '';
  }

  normalizeTransaction(row: any): Transaction | null {
    let amount = 0;
    let isIncome = false;
    const amountValue = this.findColumnValue(row, this.bankFormat.columnMappings.amount);

    if (amountValue && amountValue !== '' && amountValue !== '0') {
      const parsedAmount = this.parseAmount(amountValue);
      if (parsedAmount === 0) return null;
      amount = Math.abs(parsedAmount);
      isIncome = parsedAmount > 0;
    } else {
      const debitValue = this.findColumnValue(row, this.bankFormat.columnMappings.debit || []);
      const creditValue = this.findColumnValue(row, this.bankFormat.columnMappings.credit || []);

      if (debitValue && debitValue !== '' && debitValue !== '0') {
        amount = Math.abs(this.parseAmount(debitValue));
        isIncome = false;
      } else if (creditValue && creditValue !== '' && creditValue !== '0') {
        amount = Math.abs(this.parseAmount(creditValue));
        isIncome = true;
      } else {
        return null;
      }
    }

    if (amount <= 0) return null;

    const dateValue = this.findColumnValue(row, this.bankFormat.columnMappings.date);
    const description = this.findColumnValue(row, this.bankFormat.columnMappings.description);
    const merchant = this.findColumnValue(row, this.bankFormat.columnMappings.merchant || []);

    if (!dateValue) return null;

    return {
      date: dateValue,
      amount,
      isIncome,
      description,
      merchant: merchant || null, // Include merchant information
      originalRow: row
    };
  }
}

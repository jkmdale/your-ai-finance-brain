import { parse as parseDate, isValid as isValidDate } from 'date-fns';

export interface Transaction {
  date: string;
  amount: number;
  isIncome: boolean;
  description: string;
  [key: string]: any;
}
export interface BankFormat {
  columnMappings: {
    date: string[];
    amount: string[];
    debit?: string[];
    credit?: string[];
    description: string[];
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
      if ((debitValue && debitValue !== '' && debitValue !== '0') ||
          (creditValue && creditValue !== '' && creditValue !== '0')) {
        const debitAmount = this.parseAmount(debitValue || '0');
        const creditAmount = this.parseAmount(creditValue || '0');
        if (debitAmount > 0 && creditAmount > 0) {
          throw new Error('Both debit and credit have values - ambiguous transaction');
        }
        if (debitAmount > 0) {
          amount = debitAmount;
          isIncome = false;
        } else if (creditAmount > 0) {
          amount = creditAmount;
          isIncome = true;
        } else {
          throw new Error(`No amount found in debit or credit columns - Debit: "${debitValue || '[empty]'}", Credit: "${creditValue || '[empty]'}"`);
        }
      } else {
        const availableColumns = Object.keys(row).join(', ');
        const expectedColumns = [
          ...(this.bankFormat.columnMappings.amount || []),
          ...(this.bankFormat.columnMappings.debit || []),
          ...(this.bankFormat.columnMappings.credit || [])
        ].join(', ');
        throw new Error(`No amount column detected. Available columns: [${availableColumns}]. Expected: [${expectedColumns}]`);
      }
    }

    const dateValue = this.findColumnValue(row, this.bankFormat.columnMappings.date);
    let dateParsed: Date | null = null;
    let dateFormats = [
      'dd/MM/yyyy', 'yyyy-MM-dd', 'dd MMM yyyy', 'dd-MM-yyyy', 'dd-MM-yy', 'dd.MM.yyyy', 'yyyyMMdd'
    ];
    for (const fmt of dateFormats) {
      const d = parseDate(dateValue, fmt, new Date());
      if (isValidDate(d)) {
        dateParsed = d;
        break;
      }
    }
    if (!dateParsed) {
      throw new Error(`Invalid date value: "${dateValue}" - expected one of formats [${dateFormats.join(', ')}]`);
    }

    let description = '';
    for (const descCol of this.bankFormat.columnMappings.description) {
      const v = this.findColumnValue(row, [descCol]);
      if (v) description += v + ' ';
    }
    description = description.trim();

    return {
      date: dateParsed.toISOString(),
      amount,
      isIncome,
      description
    };
  }
}

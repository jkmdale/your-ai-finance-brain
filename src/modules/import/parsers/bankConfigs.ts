/*
  File: src/modules/import/parsers/bankConfigs.ts
  Description: Bank-specific configurations for CSV parsing
  Easily extensible for adding new banks
*/

export interface BankConfig {
  name: string;
  identifiers: {
    filePatterns: string[];
    headerPatterns: string[];
    contentPatterns: string[];
  };
  columns: {
    date: string[];
    description: string[];
    amount?: string[];
    debit?: string[];
    credit?: string[];
    balance?: string[];
    reference?: string[];
    merchant?: string[]; // Add merchant field
  };
  dateFormat?: string; // e.g., 'DD/MM/YYYY', 'YYYY-MM-DD'
  amountFormat?: {
    thousandsSeparator?: string;
    decimalSeparator?: string;
    currencySymbol?: string;
  };
}

// Configuration for all major NZ banks
export const BANK_CONFIGS: BankConfig[] = [
  // ANZ Bank
  {
    name: 'ANZ',
    identifiers: {
      filePatterns: ['anz', 'anzbank'],
      headerPatterns: ['anz', 'transaction', 'date'],
      contentPatterns: ['anz bank', 'australia and new zealand banking group']
    },
    columns: {
      date: ['Date', 'Transaction Date', 'Value Date'],
      description: ['Description', 'Transaction Details', 'Details'],
      amount: ['Amount', 'Value'],
      debit: ['Debit Amount', 'Debit'],
      credit: ['Credit Amount', 'Credit'],
      merchant: ['Particulars', 'Code', 'Merchant', 'Other Party', 'Payee'] // Add merchant mappings
    }
  },
  // ASB Bank
  {
    name: 'ASB',
    identifiers: {
      filePatterns: ['asb', 'asbbank'],
      headerPatterns: ['asb', 'particulars', 'analysis'],
      contentPatterns: ['asb bank', 'auckland savings bank']
    },
    columns: {
      date: ['Date', 'Transaction Date', 'Process Date'],
      description: ['Description', 'Transaction Details'],
      amount: ['Amount', 'Value'],
      reference: ['Reference', 'Analysis Code'],
      merchant: ['Particulars', 'Code', 'Merchant', 'Other Party', 'Payee', 'Narrative'] // Add merchant mappings
    }
  },
  // Westpac Bank
  {
    name: 'Westpac',
    identifiers: {
      filePatterns: ['westpac', 'westpacbank'],
      headerPatterns: ['westpac', 'narrative', 'reference'],
      contentPatterns: ['westpac', 'westpac banking corporation']
    },
    columns: {
      date: ['Date', 'Transaction Date', 'Value Date'],
      description: ['Description', 'Narrative', 'Transaction Details'],
      amount: ['Amount', 'Value'],
      debit: ['Debit Amount', 'DR'],
      credit: ['Credit Amount', 'CR'],
      merchant: ['Particulars', 'Code', 'Merchant', 'Other Party', 'Payee', 'Narrative'] // Add merchant mappings
    }
  },
  // Kiwibank
  {
    name: 'Kiwibank',
    identifiers: {
      filePatterns: ['kiwibank', 'kiwi'],
      headerPatterns: ['kiwibank', 'memo', 'description'],
      contentPatterns: ['kiwibank']
    },
    columns: {
      date: ['Date', 'Transaction Date', 'Value Date'],
      description: ['Description', 'Memo', 'Transaction Details'],
      amount: ['Amount', 'Value'],
      debit: ['Debit Amount', 'Withdrawals'],
      credit: ['Credit Amount', 'Deposits'],
      merchant: ['Particulars', 'Code', 'Merchant', 'Other Party', 'Payee', 'Memo'] // Add merchant mappings
    }
  },
  // BNZ
  {
    name: 'BNZ',
    identifiers: {
      filePatterns: ['bnz', 'bnzbank'],
      headerPatterns: ['bnz', 'particulars', 'code', 'reference'],
      contentPatterns: ['bnz', 'bank of new zealand']
    },
    columns: {
      date: ['Date', 'Transaction Date', 'Process Date'],
      description: ['Particulars', 'Transaction Type', 'Description'],
      amount: ['Amount', 'Value'],
      reference: ['Reference', 'Other Party', 'Code'],
      merchant: ['Particulars', 'Code', 'Merchant', 'Other Party', 'Payee'] // Add merchant mappings - Particulars is the key field for BNZ
    }
  },
  // TSB Bank
  {
    name: 'TSB',
    identifiers: {
      filePatterns: ['tsb', 'tsbbank'],
      headerPatterns: ['tsb', 'transaction', 'narrative'],
      contentPatterns: ['tsb bank', 'taranaki savings bank']
    },
    columns: {
      date: ['Date', 'Transaction Date', 'Value Date'],
      description: ['Description', 'Narrative', 'Details'],
      amount: ['Amount', 'Transaction Amount'],
      debit: ['Debit Amount', 'DR'],
      credit: ['Credit Amount', 'CR']
    }
  },
  // Rabobank
  {
    name: 'Rabobank',
    identifiers: {
      filePatterns: ['rabobank', 'rabo'],
      headerPatterns: ['rabobank', 'description', 'debit/credit'],
      contentPatterns: ['rabobank', 'rabobank new zealand']
    },
    columns: {
      date: ['Date', 'Transaction Date', 'Booking Date'],
      description: ['Description', 'Narrative', 'Transaction Details'],
      amount: ['Amount', 'Debit/Credit'],
      balance: ['Balance', 'Account Balance']
    }
  },
  // Co-operative Bank
  {
    name: 'Co-operative Bank',
    identifiers: {
      filePatterns: ['cooperative', 'co-op', 'coop'],
      headerPatterns: ['co-operative', 'narrative', 'transaction'],
      contentPatterns: ['co-operative bank', 'the co-operative bank']
    },
    columns: {
      date: ['Date', 'Transaction Date'],
      description: ['Narrative', 'Description', 'Transaction Details'],
      debit: ['Debit', 'Withdrawals'],
      credit: ['Credit', 'Deposits'],
      balance: ['Balance']
    }
  },
  // SBS Bank
  {
    name: 'SBS Bank',
    identifiers: {
      filePatterns: ['sbs', 'sbsbank'],
      headerPatterns: ['sbs', 'transaction', 'description'],
      contentPatterns: ['sbs bank', 'southland building society']
    },
    columns: {
      date: ['Date', 'Trans Date', 'Transaction Date'],
      description: ['Description', 'Transaction', 'Details'],
      amount: ['Amount', 'Transaction Amount'],
      balance: ['Balance', 'Running Balance']
    }
  },
  // Heartland Bank
  {
    name: 'Heartland Bank',
    identifiers: {
      filePatterns: ['heartland', 'heartlandbank'],
      headerPatterns: ['heartland', 'description', 'value'],
      contentPatterns: ['heartland bank', 'heartland']
    },
    columns: {
      date: ['Date', 'Transaction Date', 'Posted Date'],
      description: ['Description', 'Transaction Details', 'Merchant'],
      amount: ['Amount', 'Value'],
      debit: ['Debit', 'DR Amount'],
      credit: ['Credit', 'CR Amount']
    }
  }
];

// Function to get bank config by name
export function getBankConfig(bankName: string): BankConfig | undefined {
  return BANK_CONFIGS.find(config => 
    config.name.toLowerCase() === bankName.toLowerCase()
  );
}

// Function to detect bank from various inputs
export function detectBankConfig(
  filename?: string, 
  headers?: string[], 
  content?: any[]
): BankConfig | undefined {
  
  for (const config of BANK_CONFIGS) {
    // Check filename
    if (filename) {
      const lowerFilename = filename.toLowerCase();
      if (config.identifiers.filePatterns.some(pattern => 
        lowerFilename.includes(pattern)
      )) {
        return config;
      }
    }
    
    // Check headers
    if (headers && headers.length > 0) {
      const headerStr = headers.join('|').toLowerCase();
      if (config.identifiers.headerPatterns.some(pattern => 
        headerStr.includes(pattern)
      )) {
        return config;
      }
    }
    
    // Check content
    if (content && content.length > 0) {
      const contentStr = JSON.stringify(content[0]).toLowerCase();
      if (config.identifiers.contentPatterns.some(pattern => 
        contentStr.includes(pattern)
      )) {
        return config;
      }
    }
  }
  
  return undefined;
}

// Function to add new bank configuration at runtime
export function addBankConfig(config: BankConfig): void {
  // Check if bank already exists
  const existingIndex = BANK_CONFIGS.findIndex(
    c => c.name.toLowerCase() === config.name.toLowerCase()
  );
  
  if (existingIndex >= 0) {
    // Update existing config
    BANK_CONFIGS[existingIndex] = config;
  } else {
    // Add new config
    BANK_CONFIGS.push(config);
  }
}

export interface BankFormat {
  id: string;
  name: string;
  country: string;
  dateFormats: string[];
  amountFormats: string[];
  headers: {
    date: string[];
    description: string[];
    amount: string[];
    balance?: string[];
    reference?: string[];
  };
  patterns: {
    datePattern: RegExp;
    amountPattern: RegExp;
    negativePattern: RegExp;
  };
  confidence: number;
}

export const BANK_FORMATS: BankFormat[] = [
  // New Zealand Banks
  {
    id: 'nz-anz',
    name: 'ANZ New Zealand',
    country: 'NZ',
    dateFormats: ['DD/MM/YYYY', 'DD-MM-YYYY'],
    amountFormats: ['$0.00', '0.00'],
    headers: {
      date: ['date', 'transaction date', 'date processed'],
      description: ['description', 'details', 'transaction details'],
      amount: ['amount', 'debit', 'credit', 'value'],
      balance: ['balance', 'running balance'],
      reference: ['reference', 'ref', 'transaction id']
    },
    patterns: {
      datePattern: /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/,
      amountPattern: /^-?\$?[\d,]+\.?\d*$/,
      negativePattern: /^-|\(.*\)$/
    },
    confidence: 0
  },
  {
    id: 'nz-asb',
    name: 'ASB Bank',
    country: 'NZ',
    dateFormats: ['DD/MM/YYYY'],
    amountFormats: ['0.00'],
    headers: {
      date: ['date', 'transaction date'],
      description: ['description', 'particulars'],
      amount: ['amount', 'debit amount', 'credit amount'],
      balance: ['balance'],
      reference: ['reference', 'analysis code']
    },
    patterns: {
      datePattern: /^\d{1,2}\/\d{1,2}\/\d{4}$/,
      amountPattern: /^-?[\d,]+\.?\d*$/,
      negativePattern: /^-/
    },
    confidence: 0
  },
  {
    id: 'nz-bnz',
    name: 'Bank of New Zealand',
    country: 'NZ',
    dateFormats: ['DD/MM/YYYY', 'YYYY-MM-DD'],
    amountFormats: ['0.00', '-0.00'],
    headers: {
      date: ['date', 'transaction date', 'value date'],
      description: ['description', 'transaction type', 'details'],
      amount: ['amount', 'debit', 'credit'],
      balance: ['balance', 'account balance'],
      reference: ['reference', 'transaction reference']
    },
    patterns: {
      datePattern: /^(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})$/,
      amountPattern: /^-?[\d,]+\.?\d*$/,
      negativePattern: /^-/
    },
    confidence: 0
  },
  // Australian Banks
  {
    id: 'au-cba',
    name: 'Commonwealth Bank',
    country: 'AU',
    dateFormats: ['DD/MM/YYYY'],
    amountFormats: ['$0.00', '-$0.00'],
    headers: {
      date: ['date', 'transaction date'],
      description: ['description', 'transaction description'],
      amount: ['amount', 'debit amount', 'credit amount'],
      balance: ['balance', 'account balance'],
      reference: ['reference', 'transaction id']
    },
    patterns: {
      datePattern: /^\d{1,2}\/\d{1,2}\/\d{4}$/,
      amountPattern: /^-?\$?[\d,]+\.?\d*$/,
      negativePattern: /^-|\(.*\)$/
    },
    confidence: 0
  },
  // UK Banks
  {
    id: 'uk-hsbc',
    name: 'HSBC UK',
    country: 'UK',
    dateFormats: ['DD/MM/YYYY', 'DD-MM-YYYY'],
    amountFormats: ['£0.00', '0.00'],
    headers: {
      date: ['date', 'transaction date', 'posting date'],
      description: ['description', 'transaction description', 'details'],
      amount: ['amount', 'debit amount', 'credit amount', 'paid out', 'paid in'],
      balance: ['balance', 'account balance'],
      reference: ['reference', 'transaction reference']
    },
    patterns: {
      datePattern: /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/,
      amountPattern: /^-?£?[\d,]+\.?\d*$/,
      negativePattern: /^-/
    },
    confidence: 0
  },
  // US Banks
  {
    id: 'us-chase',
    name: 'Chase Bank',
    country: 'US',
    dateFormats: ['MM/DD/YYYY'],
    amountFormats: ['$0.00', '-$0.00'],
    headers: {
      date: ['date', 'transaction date', 'post date'],
      description: ['description', 'transaction description'],
      amount: ['amount', 'debit', 'credit'],
      balance: ['balance', 'running balance'],
      reference: ['reference', 'check number']
    },
    patterns: {
      datePattern: /^\d{1,2}\/\d{1,2}\/\d{4}$/,
      amountPattern: /^-?\$?[\d,]+\.?\d*$/,
      negativePattern: /^-/
    },
    confidence: 0
  }
];

export const detectBankFormat = (headers: string[], sampleData: string[][]): BankFormat | null => {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  
  let bestMatch: BankFormat | null = null;
  let highestScore = 0;

  for (const format of BANK_FORMATS) {
    let score = 0;
    
    // Check header matches
    const dateHeaderMatch = format.headers.date.some(h => 
      normalizedHeaders.some(nh => nh.includes(h.toLowerCase()))
    );
    const descriptionHeaderMatch = format.headers.description.some(h => 
      normalizedHeaders.some(nh => nh.includes(h.toLowerCase()))
    );
    const amountHeaderMatch = format.headers.amount.some(h => 
      normalizedHeaders.some(nh => nh.includes(h.toLowerCase()))
    );
    
    if (dateHeaderMatch) score += 30;
    if (descriptionHeaderMatch) score += 25;
    if (amountHeaderMatch) score += 25;
    
    // Check data pattern matches
    if (sampleData.length > 0) {
      const dateColumnIndex = normalizedHeaders.findIndex(h => 
        format.headers.date.some(dateHeader => h.includes(dateHeader.toLowerCase()))
      );
      const amountColumnIndex = normalizedHeaders.findIndex(h => 
        format.headers.amount.some(amountHeader => h.includes(amountHeader.toLowerCase()))
      );
      
      if (dateColumnIndex >= 0 && sampleData[0][dateColumnIndex]) {
        const dateValue = sampleData[0][dateColumnIndex];
        if (format.patterns.datePattern.test(dateValue)) {
          score += 20;
        }
      }
      
      if (amountColumnIndex >= 0 && sampleData[0][amountColumnIndex]) {
        const amountValue = sampleData[0][amountColumnIndex];
        if (format.patterns.amountPattern.test(amountValue)) {
          score += 20;
        }
      }
    }
    
    if (score > highestScore) {
      highestScore = score;
      bestMatch = { ...format, confidence: score / 100 };
    }
  }
  
  return bestMatch && highestScore > 50 ? bestMatch : null;
};

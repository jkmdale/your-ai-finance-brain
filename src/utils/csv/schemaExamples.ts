export interface SchemaTemplate {
  bank: string;
  fields: string[];
  map: {
    date: string;
    description: string;
    amount: string;
  };
}

export const schemaTemplates: SchemaTemplate[] = [
  {
    bank: 'ANZ',
    fields: ['date', 'amount', 'particulars', 'code', 'reference'],
    map: {
      date: 'Date',
      description: 'Particulars',
      amount: 'Amount'
    }
  },
  {
    bank: 'ASB',
    fields: ['date', 'amount', 'description'],
    map: {
      date: 'Date',
      description: 'Particulars',
      amount: 'Amount'
    }
  },
  {
    bank: 'Westpac',
    fields: ['date', 'description', 'amount'],
    map: {
      date: 'Date',
      description: 'Transaction Description',
      amount: 'Amount'
    }
  },
  {
    bank: 'BNZ',
    fields: ['date', 'description', 'amount'],
    map: {
      date: 'Date',
      description: 'Description',
      amount: 'Amount'
    }
  },
  {
    bank: 'Kiwibank',
    fields: ['date', 'amount', 'description'],
    map: {
      date: 'Date',
      description: 'Payee',
      amount: 'Amount'
    }
  },
  {
    bank: 'CustomLoanCSV',
    fields: ['date', 'details', 'amount'],
    map: {
      date: 'Date',
      description: 'Details',
      amount: 'Amount'
    }
  }
];

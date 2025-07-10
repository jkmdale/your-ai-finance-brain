export const schemaTemplates = [
  {
    name: 'Generic Format',
    fields: ['date', 'amount', 'description'],
    map: {
      date: 'Date',
      amount: 'Amount',
      description: 'Description'
    }
  },
  {
    name: 'ANZ Bank',
    fields: ['tran date', 'particulars', 'amount'],
    map: {
      date: 'Tran Date',
      amount: 'Amount',
      description: 'Particulars'
    }
  },
  {
    name: 'ASB Bank',
    fields: ['date', 'particulars', 'amount'],
    map: {
      date: 'Date',
      amount: 'Amount', 
      description: 'Particulars'
    }
  },
  {
    name: 'Westpac Bank',
    fields: ['date', 'narrative', 'amount'],
    map: {
      date: 'Date',
      amount: 'Amount',
      description: 'Narrative'
    }
  },
  {
    name: 'Kiwibank',
    fields: ['date', 'payee', 'amount'],
    map: {
      date: 'Date',
      amount: 'Amount',
      description: 'Payee'
    }
  },
  {
    name: 'BNZ Bank',
    fields: ['posting date', 'description', 'amount'],
    map: {
      date: 'Posting Date',
      amount: 'Amount',
      description: 'Description'
    }
  },
  {
    name: 'Common Debit/Credit Format',
    fields: ['date', 'description', 'debit', 'credit'],
    map: {
      date: 'Date',
      amount: 'Debit', // Will be handled specially in parsing
      description: 'Description'
    }
  }
];

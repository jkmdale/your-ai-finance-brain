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
    name: 'Wells Fargo',
    fields: ['posted date', 'amount', 'payee'],
    map: {
      date: 'Posted Date',
      amount: 'Amount',
      description: 'Payee'
    }
  },
  {
    name: 'Monzo',
    fields: ['created', 'amount', 'merchant name'],
    map: {
      date: 'Created',
      amount: 'Amount',
      description: 'Merchant Name'
    }
  }
];

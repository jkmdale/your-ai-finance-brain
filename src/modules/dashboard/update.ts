// Dashboard update utilities
export function updateDashboard(): void {
  console.log('📊 Triggering dashboard refresh');
  window.dispatchEvent(new CustomEvent('dashboard-update'));
  window.dispatchEvent(new CustomEvent('smartfinance-complete'));
}

export function updateDashboardState(transactions: any[]): void {
  // Filter out transfers and reversals for accurate dashboard metrics
  const validTransactions = transactions.filter(tx => 
    tx.category !== 'Transfer' && 
    tx.category !== 'Reversal' &&
    !tx.isTransfer &&
    !tx.isReversal
  );

  console.log(`📊 Dashboard state updated: ${validTransactions.length} valid transactions (${transactions.length - validTransactions.length} filtered out)`);
  
  // Dispatch both events to ensure all components refresh
  updateDashboard();
  
  // Dispatch CSV completion event for goals generation
  window.dispatchEvent(new CustomEvent('csv-upload-complete', { 
    detail: { transactions: validTransactions } 
  }));
}
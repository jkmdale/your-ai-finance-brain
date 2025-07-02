// Dashboard update utilities
export function updateDashboard(): void {
  // Trigger dashboard refresh
  console.log('Dashboard updated');
  window.dispatchEvent(new CustomEvent('dashboard-update'));
}

export function updateDashboardState(transactions: any[]): void {
  console.log(`Dashboard state updated with ${transactions.length} transactions`);
  updateDashboard();
}
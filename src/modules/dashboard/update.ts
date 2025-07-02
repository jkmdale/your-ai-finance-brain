// Dashboard update utilities
export function updateDashboard(): void {
  // Trigger dashboard refresh
  console.log('Dashboard updated');
  window.dispatchEvent(new CustomEvent('dashboard-update'));
}
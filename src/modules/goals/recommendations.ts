/* File: src/modules/goals/recommendGoals.ts Description: Recommends SMART financial goals based on categorized transaction history. */

import { Transaction } from '../import/types'

export interface SmartGoal { category: string description: string amount: number timeframeMonths: number }

export function recommendSmartGoals(transactions: Transaction[]): SmartGoal[] { const categoryTotals: Record<string, number[]> = {}

// Group amounts by category by month for (const tx of transactions) { if (!tx.category || tx.type !== 'debit') continue

const key = tx.category
if (!categoryTotals[key]) categoryTotals[key] = []
categoryTotals[key].push(Math.abs(tx.amount))

}

const goals: SmartGoal[] = []

for (const [category, amounts] of Object.entries(categoryTotals)) { const count = amounts.length const total = amounts.reduce((sum, v) => sum + v, 0) const avg = total / count

// Recommend a 10% reduction goal
if (avg > 100) {
  goals.push({
    category,
    amount: Math.round(avg * 0.9),
    timeframeMonths: 3,
    description: `Try to reduce your ${category} spend by 10% over the next 3 months.`
  })
}

}

return goals.slice(0, 3) // Limit to top 3 }


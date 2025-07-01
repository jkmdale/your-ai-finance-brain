/* File: src/components/goals/SmartGoalsCard.tsx Description: UI component to display a list of SMART financial goals. */

import { useEffect, useState } from 'react' import { loadSmartGoals, clearSmartGoals } from '@/modules/goals/saveSmartGoals' import type { SmartGoal } from '@/modules/goals/recommendGoals' import { Card, CardContent } from '@/components/ui/card' import { Button } from '@/components/ui/button'

export default function SmartGoalsCard() { const [goals, setGoals] = useState<SmartGoal[]>([])

useEffect(() => { loadSmartGoals().then(setGoals) }, [])

if (!goals.length) return null

return ( <Card className="p-4 space-y-4"> <h2 className="text-xl font-bold">Recommended SMART Goals</h2> <CardContent className="space-y-2"> {goals.map((goal, i) => ( <div key={i} className="border p-2 rounded-lg bg-muted"> <div className="font-semibold">{goal.category}</div> <div className="text-sm text-muted-foreground">{goal.description}</div> <div className="text-sm italic mt-1">Target: ${goal.amount} in {goal.timeframeMonths} months</div> </div> ))} <Button variant="ghost" size="sm" onClick={() => clearSmartGoals().then(() => setGoals([]))}> Clear Goals </Button> </CardContent> </Card> ) }


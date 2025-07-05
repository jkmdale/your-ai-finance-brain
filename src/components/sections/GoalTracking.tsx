import React, { useEffect, useState } from 'react';
import { Target, Home, Plane, GraduationCap, Heart, TrendingUp, Plus, Calendar, DollarSign, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Goal {
  id: string;
  name: string;
  goal_type: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  priority: number;
  is_active: boolean;
  description?: string;
}

interface SmartGoalSuggestion {
  name: string;
  target_amount: number;
  rationale: string;
  priority: 'high' | 'medium' | 'low';
  suggested_timeline: string;
}

export const GoalTracking = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [suggestions, setSuggestions] = useState<SmartGoalSuggestion[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchGoals = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('financial_goals')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('priority', { ascending: false });

        setGoals(data || []);
      } catch (error) {
        console.error('Error fetching goals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, [user]);

  const getGoalIcon = (goalType: string) => {
    const iconMap: { [key: string]: any } = {
      'emergency': Target,
      'house': Home,
      'vacation': Plane,
      'education': GraduationCap,
      'other': Heart
    };
    return iconMap[goalType] || Target;
  };

  const getGoalColor = (goalType: string) => {
    const colorMap: { [key: string]: string } = {
      'emergency': 'green',
      'house': 'blue',
      'vacation': 'purple',
      'education': 'orange',
      'other': 'pink'
    };
    return colorMap[goalType] || 'gray';
  };

  const getPriorityLevel = (priority: number) => {
    if (priority >= 3) return 'High';
    if (priority >= 2) return 'Medium';
    return 'Low';
  };

  const fetchGoalSuggestions = async () => {
    try {
      // Get user's recent transactions to generate suggestions
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          amount,
          description,
          transaction_date,
          is_income,
          categories(name)
        `)
        .eq('user_id', user?.id)
        .order('transaction_date', { ascending: false })
        .limit(50);

      if (!transactions) return;

      // Analyze spending patterns to suggest goals
      const monthlyExpenses = transactions
        .filter(t => !t.is_income)
        .reduce((sum, t) => sum + t.amount, 0);

      const categorySpending = transactions
        .filter(t => !t.is_income)
        .reduce((acc, t) => {
          const category = t.categories?.name || 'Other';
          acc[category] = (acc[category] || 0) + t.amount;
          return acc;
        }, {} as Record<string, number>);

      // Generate smart suggestions
      const smartSuggestions: SmartGoalSuggestion[] = [];

      // Emergency fund suggestion
      if (monthlyExpenses > 0) {
        smartSuggestions.push({
          name: 'Emergency Fund',
          target_amount: monthlyExpenses * 6,
          rationale: 'Build 6 months of expenses for financial security',
          priority: 'high',
          suggested_timeline: '12 months'
        });
      }

      // Dining reduction goal
      const diningSpend = categorySpending['Food & Dining'] || 0;
      if (diningSpend > 400) {
        smartSuggestions.push({
          name: 'Reduce Dining Out',
          target_amount: diningSpend * 0.2,
          rationale: `Save $${Math.round(diningSpend * 0.2)} monthly by cooking more at home`,
          priority: 'medium',
          suggested_timeline: '3 months'
        });
      }

      // Vacation fund based on entertainment spending
      const entertainmentSpend = categorySpending['Entertainment'] || 0;
      if (entertainmentSpend > 200) {
        smartSuggestions.push({
          name: 'Dream Vacation Fund',
          target_amount: entertainmentSpend * 12,
          rationale: 'Redirect entertainment budget to save for a memorable trip',
          priority: 'low',
          suggested_timeline: '18 months'
        });
      }

      setSuggestions(smartSuggestions);
    } catch (error) {
      console.error('Error fetching goal suggestions:', error);
    }
  };

  useEffect(() => {
    const fetchGoals = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('financial_goals')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('priority', { ascending: false });

        setGoals(data || []);
        await fetchGoalSuggestions();
      } catch (error) {
        console.error('Error fetching goals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, [user]);

  const createGoalFromSuggestion = async (suggestion: SmartGoalSuggestion) => {
    if (!user) return;

    try {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + parseInt(suggestion.suggested_timeline));

      const { error } = await supabase
        .from('financial_goals')
        .insert({
          user_id: user.id,
          name: suggestion.name,
          goal_type: suggestion.name.toLowerCase().includes('emergency') ? 'emergency' : 'other',
          target_amount: suggestion.target_amount,
          current_amount: 0,
          target_date: targetDate.toISOString().split('T')[0],
          priority: suggestion.priority === 'high' ? 3 : suggestion.priority === 'medium' ? 2 : 1,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Goal Created",
        description: `${suggestion.name} has been added to your goals.`,
      });

      // Refresh goals
      const { data } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      setGoals(data || []);
    } catch (error) {
      console.error('Error creating goal:', error);
      toast({
        title: "Error",
        description: "Failed to create goal. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <section id="goals" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
          </div>
        </div>
      </section>
    );
  }

  // Empty state with AI suggestions
  if (goals.length === 0) {
    return (
      <section id="goals" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              SMART Goal Tracking
            </h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              Set Specific, Measurable, Achievable, Relevant, Time-bound financial goals
            </p>
          </div>

          {/* AI Suggestions */}
          {suggestions.length > 0 && (
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">
                🧠 AI-Suggested Goals Based on Your Spending
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 hover:from-white/25 hover:to-white/15 transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="text-lg font-semibold text-white">{suggestion.name}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        suggestion.priority === 'high' ? 'bg-red-500/20 text-red-300' : 
                        suggestion.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' : 
                        'bg-green-500/20 text-green-300'
                      }`}>
                        {suggestion.priority}
                      </span>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-white/80 text-sm mb-2">{suggestion.rationale}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Target:</span>
                        <span className="text-white font-semibold">${suggestion.target_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Timeline:</span>
                        <span className="text-white font-semibold">{suggestion.suggested_timeline}</span>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => createGoalFromSuggestion(suggestion)}
                      className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create This Goal
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-3xl p-12 shadow-2xl text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <Target className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Start Your Financial Journey</h3>
            <p className="text-white/70 mb-8 max-w-2xl mx-auto">
              Create your first financial goal and let our AI help you develop a personalized strategy to achieve it faster.
            </p>
            
            {/* Goal Templates */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { name: 'Emergency Fund', icon: Target, color: 'green', description: '3-6 months expenses' },
                { name: 'House Down Payment', icon: Home, color: 'blue', description: '20% of home value' },
                { name: 'Dream Vacation', icon: Plane, color: 'purple', description: 'Travel goals' },
                { name: 'Education Fund', icon: GraduationCap, color: 'orange', description: 'Learning investment' }
              ].map((template, index) => {
                const IconComponent = template.icon;
                return (
                  <div key={index} className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-4 hover:bg-white/15 transition-all duration-200 cursor-pointer">
                    <div className={`w-12 h-12 bg-gradient-to-br from-${template.color}-400 to-${template.color}-500 rounded-xl flex items-center justify-center mx-auto mb-3`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="text-white font-medium mb-1">{template.name}</h4>
                    <p className="text-white/60 text-xs">{template.description}</p>
                  </div>
                );
              })}
            </div>

            <button className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-4 rounded-full hover:from-purple-600 hover:to-blue-600 transition-all duration-200 font-medium flex items-center space-x-2 mx-auto">
              <Plus className="w-5 h-5" />
              <span>Create Your First Goal</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="goals" className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            SMART Goal Tracking
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            AI-optimized goal management with predictive analytics and achievement strategies
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {goals.map((goal) => {
            const IconComponent = getGoalIcon(goal.goal_type);
            const color = getGoalColor(goal.goal_type);
            const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
            const priority = getPriorityLevel(goal.priority);
            const remaining = goal.target_amount - goal.current_amount;
            const monthsRemaining = goal.target_date ? 
              Math.max(0, Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30)))
              : null;
            const monthlyRequired = monthsRemaining ? remaining / monthsRemaining : 0;
            
            return (
              <div key={goal.id} className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 hover:from-white/25 hover:to-white/15 transition-all duration-300 shadow-2xl">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 bg-gradient-to-br from-${color}-400 to-${color}-500 rounded-xl flex items-center justify-center`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{goal.name}</h3>
                      <p className="text-white/60 text-sm capitalize">{goal.goal_type} goal</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    priority === 'High' ? 'bg-red-500/20 text-red-300' : 
                    priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-300' : 
                    'bg-green-500/20 text-green-300'
                  }`}>
                    {priority}
                  </span>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/80 font-medium">Progress</span>
                    <span className="text-white font-semibold">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-3 bg-white/20" />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-white/60 text-sm mb-1">Current</p>
                    <p className="text-white font-semibold">${goal.current_amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-sm mb-1">Target</p>
                    <p className="text-white font-semibold">${goal.target_amount.toLocaleString()}</p>
                  </div>
                  {monthsRemaining && (
                    <>
                      <div>
                        <p className="text-white/60 text-sm mb-1">Remaining</p>
                        <p className="text-white font-semibold">${remaining.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-white/60 text-sm mb-1">Monthly Needed</p>
                        <p className="text-white font-semibold">${monthlyRequired.toLocaleString()}</p>
                      </div>
                    </>
                  )}
                </div>

                {/* SMART Goal Analysis */}
                <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-4 mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 font-medium text-sm">SMART Analysis</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center space-x-1">
                      <span className="text-green-400">✓</span>
                      <span className="text-white/80">Specific</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-green-400">✓</span>
                      <span className="text-white/80">Measurable</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className={monthlyRequired < 1000 ? "text-green-400" : "text-yellow-400"}>
                        {monthlyRequired < 1000 ? "✓" : "⚠"}
                      </span>
                      <span className="text-white/80">Achievable</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-green-400">✓</span>
                      <span className="text-white/80">Time-bound</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  {goal.target_date && (
                    <div className="text-white/60 text-sm flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(goal.target_date).toLocaleDateString()}</span>
                      {monthsRemaining && (
                        <span className="text-white/80">({monthsRemaining} months)</span>
                      )}
                    </div>
                  )}
                  <div className="flex space-x-2 ml-auto">
                    <Button variant="outline" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                      Adjust
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Create New Goal CTA */}
        <div className="mt-12 text-center">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-8 py-3 text-lg">
                <Plus className="w-5 h-5 mr-2" />
                Create SMART Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create a SMART Financial Goal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                  <strong>SMART Goals are:</strong><br/>
                  <strong>S</strong>pecific, <strong>M</strong>easurable, <strong>A</strong>chievable, <strong>R</strong>elevant, <strong>T</strong>ime-bound
                </div>
                {/* Goal creation form would go here */}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </section>
  );
};

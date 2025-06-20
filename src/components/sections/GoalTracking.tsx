
import React, { useEffect, useState } from 'react';
import { Target, Home, Plane, GraduationCap, Heart, TrendingUp, Plus } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Goal {
  id: string;
  name: string;
  goal_type: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  priority: number;
  is_active: boolean;
}

export const GoalTracking = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

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

  // Empty state for no goals
  if (goals.length === 0) {
    return (
      <section id="goals" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Intelligent Goal Tracking
            </h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              Set financial goals and let AI optimize your path to achievement
            </p>
          </div>

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
            Intelligent Goal Tracking
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
            const timeToGoal = Math.ceil((goal.target_amount - goal.current_amount) / (goal.current_amount / 12));
            
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
                </div>

                {goal.current_amount > 0 && (
                  <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-4 mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 font-medium text-sm">AI Prediction</span>
                    </div>
                    <p className="text-white/80 text-sm">
                      At your current savings rate, you'll reach this goal in approximately {timeToGoal} months. 
                      Consider increasing monthly contributions by $200 to achieve it 3 months earlier.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  {goal.target_date && (
                    <div className="text-white/60 text-sm">
                      Target date: {new Date(goal.target_date).toLocaleDateString()}
                    </div>
                  )}
                  <div className="flex space-x-2 ml-auto">
                    <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200">
                      Adjust
                    </button>
                    <button className={`bg-gradient-to-r from-${color}-400 to-${color}-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity duration-200`}>
                      Add Funds
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Goal Creation CTA */}
        <div className="mt-12 text-center">
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-8 inline-block">
            <Plus className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-4">Create Another Goal</h3>
            <p className="text-white/70 mb-6 max-w-md">
              Set up additional financial goals and let our AI help you achieve them faster with optimized strategies.
            </p>
            <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-full hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg font-medium">
              + Create New Goal
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};


import React from 'react';
import { Target, Home, Plane, GraduationCap, Heart, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export const GoalTracking = () => {
  const goals = [
    {
      id: 1,
      title: 'Emergency Fund',
      description: '6 months of expenses',
      current: 18500,
      target: 25000,
      progress: 74,
      icon: Target,
      color: 'green',
      deadline: '2024-12-31',
      priority: 'High'
    },
    {
      id: 2,
      title: 'House Down Payment',
      description: '20% down payment',
      current: 45000,
      target: 100000,
      progress: 45,
      icon: Home,
      color: 'blue',
      deadline: '2025-06-30',
      priority: 'High'
    },
    {
      id: 3,
      title: 'European Vacation',
      description: 'Dream trip to Europe',
      current: 3200,
      target: 8000,
      progress: 40,
      icon: Plane,
      color: 'purple',
      deadline: '2024-08-15',
      priority: 'Medium'
    },
    {
      id: 4,
      title: 'MBA Program',
      description: 'Executive MBA tuition',
      current: 12000,
      target: 60000,
      progress: 20,
      icon: GraduationCap,
      color: 'orange',
      deadline: '2025-09-01',
      priority: 'Medium'
    }
  ];

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
            const IconComponent = goal.icon;
            const timeToGoal = Math.ceil((goal.target - goal.current) / (goal.current / 12)); // Rough calculation
            
            return (
              <div key={goal.id} className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 hover:from-white/25 hover:to-white/15 transition-all duration-300 shadow-2xl">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 bg-gradient-to-br from-${goal.color}-400 to-${goal.color}-500 rounded-xl flex items-center justify-center`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{goal.title}</h3>
                      <p className="text-white/60 text-sm">{goal.description}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    goal.priority === 'High' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'
                  }`}>
                    {goal.priority}
                  </span>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/80 font-medium">Progress</span>
                    <span className="text-white font-semibold">{goal.progress}%</span>
                  </div>
                  <Progress value={goal.progress} className="h-3 bg-white/20" />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-white/60 text-sm mb-1">Current</p>
                    <p className="text-white font-semibold">${goal.current.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-sm mb-1">Target</p>
                    <p className="text-white font-semibold">${goal.target.toLocaleString()}</p>
                  </div>
                </div>

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

                <div className="flex items-center justify-between">
                  <div className="text-white/60 text-sm">
                    Target date: {new Date(goal.deadline).toLocaleDateString()}
                  </div>
                  <div className="flex space-x-2">
                    <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200">
                      Adjust
                    </button>
                    <button className={`bg-gradient-to-r from-${goal.color}-400 to-${goal.color}-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity duration-200`}>
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
            <Heart className="w-16 h-16 text-pink-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-4">Create Your First Goal</h3>
            <p className="text-white/70 mb-6 max-w-md">
              Set up personalized financial goals and let our AI help you achieve them faster with optimized strategies.
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

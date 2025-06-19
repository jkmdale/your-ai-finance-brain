
import React from 'react';
import { Brain, TrendingUp, AlertTriangle, Lightbulb, Target, DollarSign } from 'lucide-react';

export const AIInsights = () => {
  const insights = [
    {
      type: 'opportunity',
      icon: Lightbulb,
      title: 'Savings Opportunity Detected',
      message: 'You could save $340/month by switching to a high-yield savings account. Based on your current balance, this could earn you an extra $4,080 annually.',
      confidence: 94,
      color: 'yellow'
    },
    {
      type: 'prediction',
      icon: TrendingUp,
      title: 'Cash Flow Prediction',
      message: 'Your account balance will likely reach $52,000 by December based on current income and spending patterns. Consider increasing your investment allocation.',
      confidence: 87,
      color: 'blue'
    },
    {
      type: 'alert',
      icon: AlertTriangle,
      title: 'Spending Pattern Alert',
      message: 'Your dining expenses increased 23% this month ($830 vs $675 average). Consider meal planning to stay within your $700 budget.',
      confidence: 96,
      color: 'orange'
    },
    {
      type: 'goal',
      icon: Target,
      title: 'Goal Achievement Update',
      message: 'At your current savings rate, you\'ll reach your emergency fund goal 2.3 months ahead of schedule. Great progress!',
      confidence: 91,
      color: 'green'
    }
  ];

  return (
    <section id="insights" className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20 mb-6">
            <Brain className="w-5 h-5 text-purple-400" />
            <span className="text-white/90 text-sm font-medium">AI-Powered Insights</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Your Personal Financial AI Coach
          </h2>
          <p className="text-xl text-white/70 max-w-3xl mx-auto">
            Advanced artificial intelligence analyzes your financial patterns to provide personalized insights, predictions, and actionable recommendations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {insights.map((insight, index) => {
            const IconComponent = insight.icon;
            return (
              <div key={index} className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 hover:from-white/25 hover:to-white/15 transition-all duration-300 shadow-2xl">
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 bg-gradient-to-br from-${insight.color}-400 to-${insight.color}-500 rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-white">{insight.title}</h3>
                      <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 bg-${insight.color}-400 rounded-full`}></div>
                        <span className="text-white/60 text-xs">{insight.confidence}% confidence</span>
                      </div>
                    </div>
                    
                    <p className="text-white/80 leading-relaxed mb-4">{insight.message}</p>
                    
                    <div className="flex items-center justify-between">
                      <button className={`text-${insight.color}-400 hover:text-${insight.color}-300 font-medium text-sm transition-colors duration-200`}>
                        View Details →
                      </button>
                      <div className="flex space-x-2">
                        <button className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors duration-200">
                          <DollarSign className="w-4 h-4 text-white/60" />
                        </button>
                        <button className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors duration-200">
                          <Target className="w-4 h-4 text-white/60" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Chat Interface Preview */}
        <div className="mt-12 backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Ask Your Financial AI</h3>
              <p className="text-white/60 text-sm">Natural language financial advice</p>
            </div>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="flex justify-end">
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl rounded-br-sm px-4 py-3 max-w-md">
                <p className="text-white text-sm">"Should I increase my retirement contributions or pay off my student loan faster?"</p>
              </div>
            </div>
            
            <div className="flex justify-start">
              <div className="backdrop-blur-sm bg-white/20 border border-white/30 rounded-2xl rounded-bl-sm px-4 py-3 max-w-md">
                <p className="text-white text-sm">Based on your current financial situation, I recommend focusing on your student loan first. At 6.8% interest, it's costing you more than the expected 7% return from retirement investments. You could save $2,340 in interest payments this year alone.</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <input 
              type="text" 
              placeholder="Ask me anything about your finances..."
              className="flex-1 bg-white/10 border border-white/20 rounded-full px-6 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200"
            />
            <button className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-3 rounded-full hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg">
              <Brain className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

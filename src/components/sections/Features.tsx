
import React from 'react';
import { 
  Brain, Globe, Shield, Users, Smartphone, Palette, 
  TrendingUp, Target, CreditCard, PiggyBank, 
  BarChart3, Zap 
} from 'lucide-react';

export const Features = () => {
  const featureCategories = [
    {
      title: 'AI-Powered Intelligence',
      icon: Brain,
      color: 'purple',
      features: [
        {
          icon: Brain,
          title: 'Smart Categorization',
          description: '95%+ accuracy in automatic expense categorization with machine learning'
        },
        {
          icon: TrendingUp,
          title: 'Predictive Analytics',
          description: '12-month financial forecasting with confidence intervals and scenarios'
        },
        {
          icon: Target,
          title: 'Personal AI Coach',
          description: 'Natural language financial advice tailored to your unique situation'
        }
      ]
    },
    {
      title: 'Global Platform',
      icon: Globe,
      color: 'blue',
      features: [
        {
          icon: CreditCard,
          title: '50+ Bank Integrations',
          description: 'ANZ, ASB, Chase, Barclays, CommBank, and more with real-time sync'
        },
        {
          icon: Globe,
          title: 'Multi-Currency Support',
          description: 'Seamless handling of multiple currencies with real-time exchange rates'
        },
        {
          icon: BarChart3,
          title: 'Universal CSV Import',
          description: 'Automatically detects and processes any bank statement format'
        }
      ]
    },
    {
      title: 'Collaborative Finance',
      icon: Users,
      color: 'green',
      features: [
        {
          icon: Users,
          title: 'Couples Integration',
          description: 'Shared budgets with individual privacy controls and permissions'
        },
        {
          icon: PiggyBank,
          title: 'Joint Goal Tracking',
          description: 'Collaborative savings goals with progress sharing and celebrations'
        },
        {
          icon: Shield,
          title: 'Privacy Controls',
          description: 'Granular control over shared vs private financial information'
        }
      ]
    },
    {
      title: 'Premium Experience',
      icon: Palette,
      color: 'pink',
      features: [
        {
          icon: Palette,
          title: 'Glassmorphism Design',
          description: 'Professional-grade frosted glass effects with dynamic backgrounds'
        },
        {
          icon: Smartphone,
          title: 'Progressive Web App',
          description: 'Native app experience with offline functionality across all devices'
        },
        {
          icon: Zap,
          title: 'Smooth Interactions',
          description: 'Butter-smooth animations and micro-interactions for premium feel'
        }
      ]
    }
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Everything You Need for
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Financial Freedom
            </span>
          </h2>
          <p className="text-xl text-white/70 max-w-4xl mx-auto leading-relaxed">
            SmartFinanceAI combines cutting-edge artificial intelligence, premium design, 
            and global functionality to create the ultimate personal finance operating system.
          </p>
        </div>

        <div className="space-y-16">
          {featureCategories.map((category, categoryIndex) => {
            const CategoryIcon = category.icon;
            
            return (
              <div key={categoryIndex} className="relative">
                {/* Category Header */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center space-x-3 mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-br from-${category.color}-400 to-${category.color}-500 rounded-xl flex items-center justify-center`}>
                      <CategoryIcon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">{category.title}</h3>
                  </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {category.features.map((feature, featureIndex) => {
                    const FeatureIcon = feature.icon;
                    
                    return (
                      <div key={featureIndex} className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 hover:from-white/25 hover:to-white/15 transition-all duration-300 shadow-2xl group">
                        <div className={`w-16 h-16 bg-gradient-to-br from-${category.color}-400 to-${category.color}-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                          <FeatureIcon className="w-8 h-8 text-white" />
                        </div>
                        
                        <h4 className="text-xl font-semibold text-white mb-3">{feature.title}</h4>
                        <p className="text-white/70 leading-relaxed">{feature.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Call to Action */}
        <div className="mt-20 text-center">
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-3xl p-12 shadow-2xl">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Transform Your Financial Life?
            </h3>
            <p className="text-xl text-white/70 mb-8 max-w-3xl mx-auto">
              Join thousands of users who have already achieved their financial goals with SmartFinanceAI. 
              Experience the future of money management today.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-10 py-4 rounded-full hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-2xl hover:shadow-purple-500/25 text-lg font-semibold">
                Start Free Trial
              </button>
              <button className="backdrop-blur-sm bg-white/10 border border-white/20 text-white px-10 py-4 rounded-full hover:bg-white/20 transition-all duration-200 text-lg font-semibold">
                Schedule Demo
              </button>
            </div>
            
            <div className="mt-8 flex items-center justify-center space-x-8 text-white/60 text-sm">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Bank-level security</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4" />
                <span>Setup in 2 minutes</span>
              </div>
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4" />
                <span>No credit card required</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

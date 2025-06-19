
import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Hero } from '@/components/sections/Hero';
import { Dashboard } from '@/components/sections/Dashboard';
import { Features } from '@/components/sections/Features';
import { AIInsights } from '@/components/sections/AIInsights';
import { GoalTracking } from '@/components/sections/GoalTracking';
import { BudgetOverview } from '@/components/sections/BudgetOverview';
import { TransactionHistory } from '@/components/sections/TransactionHistory';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-blue-950 to-indigo-950 relative">
      {/* Static Background Elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-0 w-80 h-80 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <Navbar />
        <Hero />
        <Dashboard />
        <AIInsights />
        <GoalTracking />
        <BudgetOverview />
        <TransactionHistory />
        <Features />
      </div>
    </div>
  );
};

export default Index;

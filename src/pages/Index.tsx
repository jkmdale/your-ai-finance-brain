
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-x-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 right-0 w-80 h-80 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full blur-3xl animate-pulse delay-2000"></div>
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

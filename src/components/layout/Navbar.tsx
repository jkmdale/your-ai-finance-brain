
import React, { useState } from 'react';
import { Menu, X, Brain, Shield, Globe, Users } from 'lucide-react';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/10 border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">SmartFinanceAI</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <a href="#dashboard" className="text-white/90 hover:text-white transition-colors duration-200">Dashboard</a>
              <a href="#goals" className="text-white/90 hover:text-white transition-colors duration-200">Goals</a>
              <a href="#budget" className="text-white/90 hover:text-white transition-colors duration-200">Budget</a>
              <a href="#insights" className="text-white/90 hover:text-white transition-colors duration-200">AI Insights</a>
              <button className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-2 rounded-full hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl">
                Get Started
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white hover:text-white/80 transition-colors duration-200"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden backdrop-blur-xl bg-white/10 border-b border-white/20">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <a href="#dashboard" className="text-white block px-3 py-2 text-base font-medium hover:bg-white/10 rounded-lg transition-colors duration-200">Dashboard</a>
            <a href="#goals" className="text-white block px-3 py-2 text-base font-medium hover:bg-white/10 rounded-lg transition-colors duration-200">Goals</a>
            <a href="#budget" className="text-white block px-3 py-2 text-base font-medium hover:bg-white/10 rounded-lg transition-colors duration-200">Budget</a>
            <a href="#insights" className="text-white block px-3 py-2 text-base font-medium hover:bg-white/10 rounded-lg transition-colors duration-200">AI Insights</a>
            <button className="w-full mt-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-2 rounded-full hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg">
              Get Started
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};


import React, { useState } from 'react';
import { Menu, X, Brain, ChevronDown, User, Settings, CreditCard, TrendingUp, PieChart, Target, Bell, HelpCircle, LogOut, DollarSign } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/30 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Menu and Logo */}
          <div className="flex items-center space-x-8">
            {/* Desktop Menu Dropdown - moved to far left */}
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center space-x-1 text-white/90 hover:text-white transition-colors duration-200 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10">
                  <span>Menu</span>
                  <ChevronDown className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-black/80 backdrop-blur-xl border-white/20 text-white">
                  <DropdownMenuItem className="hover:bg-white/10 cursor-pointer">
                    <TrendingUp className="w-4 h-4 mr-3" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-white/10 cursor-pointer">
                    <Target className="w-4 h-4 mr-3" />
                    Goals
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-white/10 cursor-pointer">
                    <PieChart className="w-4 h-4 mr-3" />
                    Budget
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-white/10 cursor-pointer">
                    <Brain className="w-4 h-4 mr-3" />
                    AI Insights
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-white/10 cursor-pointer">
                    <CreditCard className="w-4 h-4 mr-3" />
                    Transactions
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/20" />
                  <DropdownMenuItem className="hover:bg-white/10 cursor-pointer">
                    <User className="w-4 h-4 mr-3" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-white/10 cursor-pointer">
                    <Bell className="w-4 h-4 mr-3" />
                    Notifications
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-white/10 cursor-pointer">
                    <Settings className="w-4 h-4 mr-3" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/20" />
                  <DropdownMenuItem className="hover:bg-white/10 cursor-pointer">
                    <HelpCircle className="w-4 h-4 mr-3" />
                    Help & Support
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:bg-white/10 cursor-pointer text-red-300 hover:text-red-200">
                    <LogOut className="w-4 h-4 mr-3" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-800 to-blue-800 rounded-xl flex items-center justify-center backdrop-blur-sm relative">
                <Brain className="w-6 h-6 text-white/90" />
                <DollarSign className="w-3 h-3 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <span className="text-xl font-bold text-white">SmartFinanceAI</span>
            </div>
          </div>

          {/* Right side - Get Started Button */}
          <div className="hidden md:block">
            <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-full hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl">
              Get Started
            </button>
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
        <div className="md:hidden backdrop-blur-xl bg-black/30 border-b border-white/10">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <a href="#dashboard" className="text-white flex items-center px-3 py-2 text-base font-medium hover:bg-white/10 rounded-lg transition-colors duration-200">
              <TrendingUp className="w-5 h-5 mr-3" />
              Dashboard
            </a>
            <a href="#goals" className="text-white flex items-center px-3 py-2 text-base font-medium hover:bg-white/10 rounded-lg transition-colors duration-200">
              <Target className="w-5 h-5 mr-3" />
              Goals
            </a>
            <a href="#budget" className="text-white flex items-center px-3 py-2 text-base font-medium hover:bg-white/10 rounded-lg transition-colors duration-200">
              <PieChart className="w-5 h-5 mr-3" />
              Budget
            </a>
            <a href="#insights" className="text-white flex items-center px-3 py-2 text-base font-medium hover:bg-white/10 rounded-lg transition-colors duration-200">
              <Brain className="w-5 h-5 mr-3" />
              AI Insights
            </a>
            <a href="#transactions" className="text-white flex items-center px-3 py-2 text-base font-medium hover:bg-white/10 rounded-lg transition-colors duration-200">
              <CreditCard className="w-5 h-5 mr-3" />
              Transactions
            </a>
            <button className="w-full mt-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-full hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg">
              Get Started
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

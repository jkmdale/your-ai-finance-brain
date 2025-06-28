
import React, { useState } from 'react';
import { Menu, X, ChevronDown, User, Settings, CreditCard, TrendingUp, PieChart, Target, Bell, HelpCircle, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SmartFinanceIcon } from '@/components/ui/smart-finance-icon';
import { useAuth } from '@/hooks/useAuth';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();

  const scrollToSection = (sectionId: string) => {
    if (location.pathname !== '/') {
      // If not on home page, navigate to home first
      window.location.href = `/#${sectionId}`;
      return;
    }
    
    const element = document.querySelector(`#${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setIsOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/30 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Hamburger Menu */}
          <div className="flex items-center">
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center space-x-1 text-white/90 hover:text-white transition-colors duration-200 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10">
                  <Menu className="w-4 h-4" />
                  <span>Menu</span>
                  <ChevronDown className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-black/80 backdrop-blur-xl border-white/20 text-white">
                  <DropdownMenuItem 
                    className="hover:bg-white/10 cursor-pointer"
                    onClick={() => scrollToSection('dashboard')}
                  >
                    <TrendingUp className="w-4 h-4 mr-3" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="hover:bg-white/10 cursor-pointer"
                    onClick={() => scrollToSection('goals')}
                  >
                    <Target className="w-4 h-4 mr-3" />
                    Goals
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="hover:bg-white/10 cursor-pointer"
                    onClick={() => scrollToSection('budget')}
                  >
                    <PieChart className="w-4 h-4 mr-3" />
                    Budget
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="hover:bg-white/10 cursor-pointer"
                    onClick={() => scrollToSection('insights')}
                  >
                    <SmartFinanceIcon size={16} className="mr-3" />
                    AI Insights
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="hover:bg-white/10 cursor-pointer"
                    onClick={() => scrollToSection('transactions')}
                  >
                    <CreditCard className="w-4 h-4 mr-3" />
                    Transactions
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/20" />
                  <DropdownMenuItem asChild className="hover:bg-white/10 cursor-pointer">
                    <Link to="/profile">
                      <User className="w-4 h-4 mr-3" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="hover:bg-white/10 cursor-pointer"
                    onClick={() => scrollToSection('notifications')}
                  >
                    <Bell className="w-4 h-4 mr-3" />
                    Notifications
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="hover:bg-white/10 cursor-pointer">
                    <Link to="/settings">
                      <Settings className="w-4 h-4 mr-3" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/20" />
                  <DropdownMenuItem asChild className="hover:bg-white/10 cursor-pointer">
                    <Link to="/help">
                      <HelpCircle className="w-4 h-4 mr-3" />
                      Help & Support
                    </Link>
                  </DropdownMenuItem>
                  {user && (
                    <DropdownMenuItem 
                      className="hover:bg-white/10 cursor-pointer text-red-300 hover:text-red-200"
                      onClick={() => signOut()}
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Sign Out
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
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

          {/* Center - Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="relative w-14 h-14 group cursor-pointer">
              {/* Outer glow ring */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/30 via-purple-500/30 to-blue-500/30 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
              
              {/* Main icon container */}
              <div className="relative w-14 h-14 bg-gradient-to-br from-slate-900 via-purple-900/50 to-blue-900/50 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-2xl group-hover:shadow-purple-500/25 transition-all duration-500 group-hover:scale-105">
                
                {/* Inner gradient overlay */}
                <div className="absolute inset-1 bg-gradient-to-br from-violet-600/20 via-purple-600/20 to-blue-600/20 rounded-xl"></div>
                
                {/* Custom SmartFinance icon */}
                <div className="relative z-10">
                  <SmartFinanceIcon 
                    size={32} 
                    className="text-white drop-shadow-lg group-hover:text-violet-100 transition-colors duration-300 filter group-hover:drop-shadow-2xl" 
                  />
                  
                  {/* Subtle sparkle effect */}
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-br from-white to-violet-200 rounded-full opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
                  <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full opacity-40 group-hover:opacity-60 transition-opacity duration-300"></div>
                </div>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-white drop-shadow-sm">SmartFinanceAI</span>
              <span className="text-xs text-white/70 font-medium tracking-wider">INTELLIGENT FINANCIAL OS</span>
            </div>
          </Link>

          {/* Right side - Auth Button or User Menu */}
          <div className="hidden md:block">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10 transition-colors duration-200">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white/90">{user.email?.split('@')[0]}</span>
                  <ChevronDown className="w-4 h-4 text-white/60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 bg-black/80 backdrop-blur-xl border-white/20 text-white">
                  <DropdownMenuItem asChild className="hover:bg-white/10 cursor-pointer">
                    <Link to="/profile">
                      <User className="w-4 h-4 mr-3" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="hover:bg-white/10 cursor-pointer">
                    <Link to="/settings">
                      <Settings className="w-4 h-4 mr-3" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/20" />
                  <DropdownMenuItem 
                    className="hover:bg-white/10 cursor-pointer text-red-300 hover:text-red-200"
                    onClick={() => signOut()}
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-full hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                Get Started
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden backdrop-blur-xl bg-black/30 border-b border-white/10">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <button
              onClick={() => scrollToSection('dashboard')}
              className="text-white flex items-center px-3 py-2 text-base font-medium hover:bg-white/10 rounded-lg transition-colors duration-200 w-full text-left"
            >
              <TrendingUp className="w-5 h-5 mr-3" />
              Dashboard
            </button>
            <button
              onClick={() => scrollToSection('goals')}
              className="text-white flex items-center px-3 py-2 text-base font-medium hover:bg-white/10 rounded-lg transition-colors duration-200 w-full text-left"
            >
              <Target className="w-5 h-5 mr-3" />
              Goals
            </button>
            <button
              onClick={() => scrollToSection('budget')}
              className="text-white flex items-center px-3 py-2 text-base font-medium hover:bg-white/10 rounded-lg transition-colors duration-200 w-full text-left"
            >
              <PieChart className="w-5 h-5 mr-3" />
              Budget
            </button>
            <button
              onClick={() => scrollToSection('insights')}
              className="text-white flex items-center px-3 py-2 text-base font-medium hover:bg-white/10 rounded-lg transition-colors duration-200 w-full text-left"
            >
              <SmartFinanceIcon size={20} className="mr-3" />
              AI Insights
            </button>
            <button
              onClick={() => scrollToSection('transactions')}
              className="text-white flex items-center px-3 py-2 text-base font-medium hover:bg-white/10 rounded-lg transition-colors duration-200 w-full text-left"
            >
              <CreditCard className="w-5 h-5 mr-3" />
              Transactions
            </button>
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              className="text-white flex items-center px-3 py-2 text-base font-medium hover:bg-white/10 rounded-lg transition-colors duration-200"
            >
              <User className="w-5 h-5 mr-3" />
              Profile
            </Link>
            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className="text-white flex items-center px-3 py-2 text-base font-medium hover:bg-white/10 rounded-lg transition-colors duration-200"
            >
              <Settings className="w-5 h-5 mr-3" />
              Settings
            </Link>
            <Link
              to="/help"
              onClick={() => setIsOpen(false)}
              className="text-white flex items-center px-3 py-2 text-base font-medium hover:bg-white/10 rounded-lg transition-colors duration-200"
            >
              <HelpCircle className="w-5 h-5 mr-3" />
              Help & Support
            </Link>
            {user ? (
              <button 
                onClick={() => signOut()}
                className="w-full text-left text-red-300 flex items-center px-3 py-2 text-base font-medium hover:bg-white/10 rounded-lg transition-colors duration-200"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Sign Out
              </button>
            ) : (
              <button className="w-full mt-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-full hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg">
                Get Started
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

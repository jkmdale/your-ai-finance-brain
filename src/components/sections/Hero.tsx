
import React from 'react';
import { Brain, Sparkles, Globe, Shield } from 'lucide-react';

export const Hero = () => {
  return (
    <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <div className="mb-8">
          <div className="inline-flex items-center space-x-2 bg-black/20 backdrop-blur-sm rounded-full px-6 py-3 border border-white/10 mb-6">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <span className="text-white/90 text-sm font-medium">AI-Powered Financial Intelligence</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Your Intelligent
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Financial OS
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-4xl mx-auto leading-relaxed">
            Transform your financial life with AI-powered automation, global multi-currency support, 
            and premium glassmorphism design. Replace dozens of apps with one intelligent platform.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-full hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-2xl hover:shadow-purple-500/25 text-lg font-semibold">
            Start Your Financial Journey
          </button>
          <button className="backdrop-blur-sm bg-black/20 border border-white/10 text-white px-8 py-4 rounded-full hover:bg-black/30 transition-all duration-200 text-lg font-semibold">
            Watch 2-Min Demo
          </button>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="backdrop-blur-sm bg-black/20 border border-white/10 rounded-2xl p-6 hover:bg-black/25 transition-all duration-300">
            <Brain className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">AI Financial Coach</h3>
            <p className="text-white/70">Personal AI that learns your patterns and guides you to financial wellness</p>
          </div>
          
          <div className="backdrop-blur-sm bg-black/20 border border-white/10 rounded-2xl p-6 hover:bg-black/25 transition-all duration-300">
            <Globe className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Global Multi-Currency</h3>
            <p className="text-white/70">50+ bank integrations across countries with real-time exchange rates</p>
          </div>
          
          <div className="backdrop-blur-sm bg-black/20 border border-white/10 rounded-2xl p-6 hover:bg-black/25 transition-all duration-300">
            <Shield className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Bank-Level Security</h3>
            <p className="text-white/70">Zero-knowledge architecture with end-to-end encryption</p>
          </div>
        </div>
      </div>
    </section>
  );
};

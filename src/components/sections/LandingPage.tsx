
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, Globe, Shield, Users, Smartphone, Target,
  TrendingUp, CreditCard, PiggyBank, BarChart3, 
  Zap, ArrowRight, CheckCircle, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onSignIn }) => {
  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerChildren = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden">
      {/* Navigation Header */}
      <motion.header 
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-white/10"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                <img src="/icon_48x48.png" alt="SmartFinanceAI" className="w-8 h-8" />
              </div>
              <span className="text-white font-bold text-xl">SmartFinanceAI</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                onClick={onSignIn}
                variant="ghost"
                className="text-white hover:bg-white/10 border-white/20"
              >
                Sign In
              </Button>
              <Button
                onClick={onGetStarted}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              >
                Get Started Free
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/2 right-0 w-80 h-80 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full blur-3xl animate-pulse delay-2000"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div 
            className="text-center mb-16"
            variants={staggerChildren}
            initial="initial"
            animate="animate"
          >
            <motion.div variants={fadeInUp} className="mb-8">
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
            </motion.div>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Button
                onClick={onGetStarted}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-full hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-2xl hover:shadow-purple-500/25 text-lg font-semibold"
              >
                Start Your Financial Journey
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                variant="outline"
                className="backdrop-blur-sm bg-black/20 border border-white/10 text-white px-8 py-4 rounded-full hover:bg-black/30 transition-all duration-200 text-lg font-semibold"
              >
                Watch 2-Min Demo
              </Button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div variants={fadeInUp} className="flex flex-wrap justify-center items-center gap-8 text-white/60 text-sm">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span>Bank-level security</span>
              </div>
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-blue-400" />
                <span>50+ countries supported</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span>Trusted by 10,000+ families</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* AI Intelligence Preview */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="inline-block bg-green-500/10 text-green-400 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              🤖 AI-Powered Intelligence
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Your Personal Financial
              <br />
              <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                AI Coach
              </span>
            </h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              Experience financial intelligence that learns from your spending patterns, 
              predicts future needs, and guides you to financial wellness.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: 'Smart Categorization',
                description: '95%+ accuracy in automatic expense categorization with machine learning',
                color: 'purple'
              },
              {
                icon: TrendingUp,
                title: 'Predictive Analytics',
                description: '12-month financial forecasting with confidence intervals and scenarios',
                color: 'blue'
              },
              {
                icon: Target,
                title: 'Personal AI Coach',
                description: 'Natural language financial advice tailored to your unique situation',
                color: 'green'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 hover:from-white/25 hover:to-white/15 transition-all duration-300 shadow-2xl group"
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className={`w-16 h-16 bg-gradient-to-br from-${feature.color}-400 to-${feature.color}-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-white/70 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Global Platform */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="inline-block bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              🌍 Global Platform
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Works With Your Banks,
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Anywhere in the World
              </span>
            </h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              Connect to 50+ banks across NZ, AU, UK, US, CA and more. 
              Real-time sync with multi-currency support and automatic exchange rates.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
            {['🇳🇿 New Zealand', '🇦🇺 Australia', '🇬🇧 United Kingdom', '🇺🇸 United States', '🇨🇦 Canada'].map((country, index) => (
              <motion.div
                key={index}
                className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-4 text-center hover:bg-white/10 transition-all duration-300"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="text-2xl mb-2">{country.split(' ')[0]}</div>
                <div className="text-white/70 text-sm">{country.split(' ').slice(1).join(' ')}</div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
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
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="text-center"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-white/70 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security & Trust */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-800 to-slate-900">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="inline-block bg-green-500/10 text-green-400 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              🔒 Bank-Level Security
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Your Data is
              <br />
              <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                Fort Knox Secure
              </span>
            </h2>
            <p className="text-xl text-white/70 mb-12">
              Zero-knowledge architecture means we never see your sensitive data. 
              End-to-end encryption with the same security standards as major banks.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: '🔐', title: 'End-to-End Encryption' },
                { icon: '🏦', title: 'Bank-Level Security' },
                { icon: '🛡️', title: 'Zero-Knowledge' },
                { icon: '✅', title: 'SOC 2 Compliant' }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-4"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="text-3xl mb-2">{item.icon}</div>
                  <div className="text-white/80 text-sm font-medium">{item.title}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Loved by Families Worldwide
            </h2>
            <div className="flex justify-center items-center space-x-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
              ))}
              <span className="ml-2 text-white/70">4.9/5 from 1,200+ reviews</span>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah & Mike Thompson",
                location: "Auckland, NZ",
                quote: "SmartFinanceAI helped us save $15,000 in our first year. The AI coach spotted spending patterns we never noticed!",
                avatar: "👩‍💼"
              },
              {
                name: "David Chen",
                location: "Sydney, AU",
                quote: "Finally, a finance app that works with my Australian and US bank accounts seamlessly. The multi-currency support is perfect.",
                avatar: "👨‍💻"
              },
              {
                name: "Emma Wilson",
                location: "London, UK",
                quote: "The collaborative features are amazing. My partner and I can manage our budget together while keeping some transactions private.",
                avatar: "👩‍🎨"
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                className="backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6"
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center mb-4">
                  <div className="text-3xl mr-3">{testimonial.avatar}</div>
                  <div>
                    <div className="text-white font-semibold">{testimonial.name}</div>
                    <div className="text-white/60 text-sm">{testimonial.location}</div>
                  </div>
                </div>
                <p className="text-white/80 italic">"{testimonial.quote}"</p>
                <div className="flex mt-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-3xl p-12 shadow-2xl"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform Your
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Financial Life?
              </span>
            </h2>
            <p className="text-xl text-white/70 mb-8 max-w-2xl mx-auto">
              Join thousands of families who have already achieved their financial goals with SmartFinanceAI. 
              Start your free trial today.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Button
                onClick={onGetStarted}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-10 py-4 rounded-full hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-2xl hover:shadow-purple-500/25 text-lg font-semibold"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                onClick={onSignIn}
                variant="outline"
                className="backdrop-blur-sm bg-white/10 border border-white/20 text-white px-10 py-4 rounded-full hover:bg-white/20 transition-all duration-200 text-lg font-semibold"
              >
                Sign In
              </Button>
            </div>
            
            <div className="flex items-center justify-center space-x-8 text-white/60 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>Free 30-day trial</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-slate-900/80 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-white/60">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-white/60">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Press</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-white/60">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-white/60">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Licenses</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <img src="/icon_48x48.png" alt="SmartFinanceAI" className="w-6 h-6" />
              </div>
              <span className="text-white font-bold">SmartFinanceAI</span>
            </div>
            <p className="text-white/60 text-sm">
              © 2024 SmartFinanceAI. All rights reserved. Your Intelligent Financial OS.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

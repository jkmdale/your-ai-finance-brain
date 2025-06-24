
import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Brain } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ClaudeAIService } from '@/services/claude-ai-service';
import type { FinancialData, Transaction } from '@/services/claude-ai-service';

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export const ChatWindow = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: "Hi! I'm your AI Financial Coach powered by Claude. I have access to your financial data and can provide personalized advice, analyze spending patterns, and help optimize your budget. What would you like to discuss?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [claudeService, setClaudeService] = useState<ClaudeAIService | null>(null);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Initialize Claude service
  useEffect(() => {
    const apiKey = process.env.CLAUDE_API_KEY || 'your-claude-api-key-here';
    setClaudeService(new ClaudeAIService(apiKey));
  }, []);

  // Fetch user's financial data for context
  useEffect(() => {
    const fetchFinancialData = async () => {
      if (!user) return;

      try {
        // Fetch recent transactions
        const { data: transactions } = await supabase
          .from('transactions')
          .select(`
            *,
            categories(name)
          `)
          .eq('user_id', user.id)
          .order('transaction_date', { ascending: false })
          .limit(50);

        // Fetch bank accounts for balance
        const { data: accounts } = await supabase
          .from('bank_accounts')
          .select('balance, account_name')
          .eq('user_id', user.id)
          .eq('is_active', true);

        // Fetch financial goals
        const { data: goals } = await supabase
          .from('financial_goals')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true);

        // Calculate financial summary
        const totalBalance = accounts?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;
        const monthlyIncome = transactions?.filter(t => t.is_income).reduce((sum, t) => sum + t.amount, 0) || 0;
        const monthlyExpenses = transactions?.filter(t => !t.is_income).reduce((sum, t) => sum + t.amount, 0) || 0;

        const formattedTransactions: Transaction[] = transactions?.map(t => ({
          id: t.id,
          description: t.description,
          amount: t.amount,
          date: t.transaction_date,
          merchant: t.merchant || '',
          category: t.categories?.name || 'Other',
          is_income: t.is_income
        })) || [];

        setFinancialData({
          totalBalance,
          monthlyIncome,
          monthlyExpenses,
          transactions: formattedTransactions,
          goals: goals?.map(g => ({
            name: g.name,
            target_amount: g.target_amount,
            current_amount: g.current_amount,
            target_date: g.target_date
          })) || []
        });
      } catch (error) {
        console.error('Error fetching financial data:', error);
      }
    };

    fetchFinancialData();
  }, [user]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !claudeService || !financialData || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await claudeService.getPersonalizedAdvice(financialData, inputValue);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error getting Claude response:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I'm having trouble connecting right now. Please try again later, or consider consulting with a financial advisor for complex questions.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!user) {
    return (
      <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl p-6 shadow-2xl h-96 flex items-center justify-center">
        <p className="text-white/60 text-center">Please sign in to access your AI Financial Coach</p>
      </div>
    );
  }

  return (
    <div className="backdrop-blur-xl bg-gradient-to-br from-white/20 to-white/10 border border-white/30 rounded-2xl shadow-2xl h-96 flex flex-col">
      {/* Header */}
      <div className="flex items-center space-x-3 p-4 border-b border-white/20">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">AI Financial Coach</h3>
          <p className="text-white/60 text-sm">Powered by Claude AI</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/20">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                message.isUser
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-br-sm'
                  : 'bg-white/20 text-white rounded-bl-sm border border-white/30'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              <span className="text-xs opacity-60 mt-2 block">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/20 border border-white/30 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center space-x-2">
              <Loader2 className="w-4 h-4 text-white animate-spin" />
              <span className="text-white/80 text-sm">Thinking...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/20">
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your finances, spending patterns, or goals..."
              disabled={isLoading}
              rows={1}
              className="w-full bg-white/10 border border-white/20 rounded-full px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200 resize-none disabled:opacity-50"
              style={{ minHeight: '44px', maxHeight: '100px' }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-3 rounded-full hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

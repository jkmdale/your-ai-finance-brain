
import React, { useState } from 'react';
import { HelpCircle, Search, BookOpen, MessageCircle, Mail, Phone, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const Help = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const faqs = [
    {
      question: "How do I upload my bank transactions?",
      answer: "You can upload your bank transactions by going to the 'Upload CSV' section and selecting your bank statement file. Our AI will automatically detect the format and categorize your transactions."
    },
    {
      question: "Is my financial data secure?",
      answer: "Yes, absolutely. We use end-to-end encryption to protect your data. Your financial information is encrypted both in transit and at rest, and we never share your personal data with third parties."
    },
    {
      question: "How does the AI categorization work?",
      answer: "Our AI analyzes transaction descriptions, amounts, and patterns to automatically categorize your expenses. You can also manually adjust categories, and the AI learns from your corrections."
    },
    {
      question: "Can I set up multiple budgets?",
      answer: "Yes, you can create multiple budgets for different purposes such as monthly expenses, vacation planning, or project-specific budgets. Each budget can have its own categories and limits."
    },
    {
      question: "How do I track my financial goals?",
      answer: "Navigate to the 'Goals' section to set up financial goals like emergency funds, debt payoff, or savings targets. You can track progress and receive personalized insights to help achieve them."
    },
    {
      question: "What file formats are supported for CSV upload?",
      answer: "We support standard CSV files from most major banks. The system can automatically detect formats from popular banks or you can manually map columns if needed."
    }
  ];

  const quickLinks = [
    { title: "Getting Started Guide", icon: BookOpen, description: "Learn the basics of using SmartFinanceAI" },
    { title: "Video Tutorials", icon: BookOpen, description: "Watch step-by-step video guides" },
    { title: "Feature Documentation", icon: BookOpen, description: "Detailed documentation for all features" },
    { title: "Community Forum", icon: MessageCircle, description: "Connect with other users and share tips" },
  ];

  const filteredFAQs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
            <HelpCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Help & Support</h1>
            <p className="text-purple-200">Find answers and get assistance</p>
          </div>
        </div>

        {/* Search */}
        <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-purple-300" />
              <Input
                placeholder="Search for help articles, FAQs, or features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-purple-300"
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Quick Links</CardTitle>
            <CardDescription className="text-purple-200">
              Popular resources to get you started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickLinks.map((link, index) => (
                <div key={index} className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <link.icon className="w-5 h-5 text-purple-300" />
                    <div>
                      <h3 className="text-white font-medium">{link.title}</h3>
                      <p className="text-purple-200 text-sm">{link.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Frequently Asked Questions</CardTitle>
            <CardDescription className="text-purple-200">
              Find answers to common questions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredFAQs.map((faq, index) => (
              <Collapsible key={index} open={openFAQ === index} onOpenChange={() => setOpenFAQ(openFAQ === index ? null : index)}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                    <span className="text-white font-medium text-left">{faq.question}</span>
                    {openFAQ === index ? (
                      <ChevronDown className="w-4 h-4 text-purple-300" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-purple-300" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 mt-2 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-purple-200">{faq.answer}</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Contact Support</CardTitle>
            <CardDescription className="text-purple-200">
              Still need help? Get in touch with our support team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-purple-300" />
                  <div>
                    <p className="text-white font-medium">Email Support</p>
                    <p className="text-purple-200 text-sm">support@smartfinanceai.com</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <MessageCircle className="w-5 h-5 text-purple-300" />
                  <div>
                    <p className="text-white font-medium">Live Chat</p>
                    <p className="text-purple-200 text-sm">Available 24/7</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  Start Live Chat
                </Button>
                <Button variant="outline" className="w-full text-purple-200 border-purple-400 hover:bg-purple-600">
                  Send Email
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Help;

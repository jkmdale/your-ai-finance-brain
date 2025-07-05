
import { TrendingUp, Target, PieChart, CreditCard, Upload, User, Settings, Bell, HelpCircle } from 'lucide-react';

export const menuItems = [
  {
    title: 'Dashboard',
    url: 'dashboard',
    icon: TrendingUp,
  },
  {
    title: 'Budget & Goals',
    url: 'goals',
    icon: Target,
  },
  {
    title: 'AI Insights',
    url: 'insights',
    icon: 'ai-icon', // Special case for AI icon
  },
  {
    title: 'CSV Upload',
    url: 'csv-upload',
    icon: Upload,
  },
  {
    title: 'AI Coach',
    url: 'coach',
    icon: PieChart,
  },
];

export const accountItems = [
  {
    title: 'Profile',
    url: '/profile',
    icon: User,
    isRoute: true,
  },
  {
    title: 'Settings',
    url: '/settings',
    icon: Settings,
    isRoute: true,
  },
  {
    title: 'Help',
    url: '/help',
    icon: HelpCircle,
    isRoute: true,
  },
];

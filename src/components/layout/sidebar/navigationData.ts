
import { TrendingUp, Target, PieChart, CreditCard, Upload, User, Settings, Bell, HelpCircle } from 'lucide-react';

export const menuItems = [
  {
    title: 'Dashboard',
    url: '/#dashboard',
    icon: TrendingUp,
  },
  {
    title: 'Goals',
    url: '/#goals',
    icon: Target,
  },
  {
    title: 'Budget',
    url: '/#budget',
    icon: PieChart,
  },
  {
    title: 'AI Insights',
    url: '/#insights',
    icon: 'ai-icon', // Special case for AI icon
  },
  {
    title: 'Transactions',
    url: '/#transactions',
    icon: CreditCard,
  },
  {
    title: 'Upload CSV',
    url: '/#upload',
    icon: Upload,
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
    title: 'Notifications',
    url: '/#notifications',
    icon: Bell,
  },
  {
    title: 'Settings',
    url: '/settings',
    icon: Settings,
    isRoute: true,
  },
];

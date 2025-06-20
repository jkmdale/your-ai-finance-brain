
import React from 'react';
import { TrendingUp, Target, PieChart, CreditCard, Upload, User, Settings, Bell, HelpCircle, LogOut } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';

const menuItems = [
  {
    title: 'Dashboard',
    url: '#dashboard',
    icon: TrendingUp,
  },
  {
    title: 'Goals',
    url: '#goals',
    icon: Target,
  },
  {
    title: 'Budget',
    url: '#budget',
    icon: PieChart,
  },
  {
    title: 'AI Insights',
    url: '#insights',
    icon: 'ai-icon', // Special case for AI icon
  },
  {
    title: 'Transactions',
    url: '#transactions',
    icon: CreditCard,
  },
  {
    title: 'Upload CSV',
    url: '#upload',
    icon: Upload,
  },
];

const accountItems = [
  {
    title: 'Profile',
    url: '#profile',
    icon: User,
  },
  {
    title: 'Notifications',
    url: '#notifications',
    icon: Bell,
  },
  {
    title: 'Settings',
    url: '#settings',
    icon: Settings,
  },
];

export const AppSidebar = () => {
  const { user, signOut } = useAuth();
  const { setOpenMobile, isMobile } = useSidebar();

  const handleItemClick = (url: string) => {
    const element = document.querySelector(url);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // If element doesn't exist, scroll to top and let user know
      window.scrollTo({ top: 0, behavior: 'smooth' });
      console.log(`Section ${url} not found, scrolling to top`);
    }
    
    // Close mobile sidebar after navigation
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      // Close mobile sidebar after sign out
      if (isMobile) {
        setOpenMobile(false);
      }
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <Sidebar className="w-64 max-w-64 border-r border-purple-700/30 bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 sticky top-0 h-screen">
      <SidebarHeader className="border-b border-purple-700/30 p-6 bg-gradient-to-r from-purple-900 via-purple-800 to-purple-900 sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="relative w-10 h-10 group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/30 via-purple-500/30 to-blue-500/30 rounded-xl blur-lg"></div>
            <div className="relative w-10 h-10 bg-gradient-to-br from-slate-900 via-purple-900/50 to-blue-900/50 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <img src="/icon-192.png" alt="Smart Finance AI" className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h2 className="text-purple-100 font-bold text-sm">SmartFinanceAI</h2>
            <p className="text-purple-200 text-xs">Financial OS</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupLabel className="text-purple-200">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => handleItemClick(item.url)}
                      className="w-full text-purple-200 hover:text-purple-100 hover:bg-purple-700/30 data-[active=true]:bg-purple-600/40 cursor-pointer transition-colors duration-200"
                    >
                      {item.icon === 'ai-icon' ? (
                        <img src="/icon-192.png" alt="AI Insights" className="w-4 h-4" />
                      ) : (
                        <item.icon className="w-4 h-4 text-purple-200" />
                      )}
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="bg-purple-700/50" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-purple-200">Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => handleItemClick(item.url)}
                      className="w-full text-purple-200 hover:text-purple-100 hover:bg-purple-700/30 cursor-pointer transition-colors duration-200"
                    >
                      <IconComponent className="w-4 h-4 text-purple-200" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="bg-purple-700/50" />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => handleItemClick('#help')}
                  className="w-full text-purple-200 hover:text-purple-100 hover:bg-purple-700/30 cursor-pointer transition-colors duration-200"
                >
                  <HelpCircle className="w-4 h-4 text-purple-200" />
                  <span>Help & Support</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {user && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={handleSignOut}
                    className="w-full text-red-300 hover:text-red-200 hover:bg-red-500/10 cursor-pointer transition-colors duration-200"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {user && (
        <SidebarFooter className="border-t border-purple-700/50 p-4 bg-gradient-to-r from-purple-900 via-purple-800 to-purple-900 sticky bottom-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-purple-200 text-sm font-medium truncate">
                {user.email?.split('@')[0]}
              </p>
              <p className="text-purple-300 text-xs">Premium User</p>
            </div>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
};

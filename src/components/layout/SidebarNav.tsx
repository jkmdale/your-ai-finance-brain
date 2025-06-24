
import React from 'react';
import { Home, TrendingUp, Target, PieChart, CreditCard, Settings, User, HelpCircle, LogOut } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';

const navigationItems = [
  {
    title: "Dashboard",
    url: "#dashboard",
    icon: Home,
  },
  {
    title: "Transactions",
    url: "#transactions",
    icon: CreditCard,
  },
  {
    title: "Budget",
    url: "#budget",
    icon: PieChart,
  },
  {
    title: "Goals",
    url: "#goals",
    icon: Target,
  },
  {
    title: "AI Insights",
    url: "#insights",
    icon: TrendingUp,
  },
];

const secondaryItems = [
  {
    title: "Profile",
    url: "#profile",
    icon: User,
  },
  {
    title: "Settings",
    url: "#settings",
    icon: Settings,
  },
  {
    title: "Help",
    url: "#help",
    icon: HelpCircle,
  },
];

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const appVersion = "1.0.0";

  return (
    <Sidebar className="border-r border-purple-700/30 bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900">
      <SidebarHeader className="border-b border-purple-700/30 p-6">
        <div className="flex items-center space-x-3">
          <div className="relative w-12 h-12 group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/30 via-purple-500/30 to-blue-500/30 rounded-xl blur-lg"></div>
            <div className="relative w-12 h-12 bg-gradient-to-br from-slate-900 via-purple-900/50 to-blue-900/50 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-xl">
              <img src="/icon_96x96.png" alt="SmartFinanceAI" className="w-8 h-8 object-contain" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">SmartFinanceAI</span>
            <span className="text-xs text-purple-200 font-medium">FINANCIAL OS</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900">
        <SidebarGroup>
          <SidebarGroupLabel className="text-purple-200">Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="text-white hover:text-white hover:bg-purple-700/30 data-[active=true]:bg-purple-600/40">
                    <a href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-purple-200">Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="text-white hover:text-white hover:bg-purple-700/30">
                    <a href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {user && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => signOut()}
                    className="text-red-300 hover:text-red-200 hover:bg-red-500/10"
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

      <SidebarFooter className="border-t border-purple-700/30 bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900">
        <div className="p-4 space-y-2">
          {user && (
            <div className="flex items-center space-x-2 text-purple-200 text-sm">
              <User className="w-4 h-4" />
              <span>{user.email?.split('@')[0] || 'User'}</span>
            </div>
          )}
          <div className="text-purple-300 text-xs">
            Version {appVersion}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 relative">
          <div className="absolute top-4 left-4 z-50">
            <SidebarTrigger className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm" />
          </div>
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}

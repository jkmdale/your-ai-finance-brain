
import React from 'react';
import { Home, TrendingUp, Target, PieChart, CreditCard, Settings, User, HelpCircle, LogOut, Menu } from 'lucide-react';
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
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
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
    icon: () => (
      <div
        style={{
          width: 24,
          height: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginLeft: -5,
        }}
      >
        <img
          src="/ai-icon.png"
          alt="AI Insights"
          style={{
            width: 24,
            height: 24,
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>
    ),
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
    <Sidebar className="border-r border-purple-200/20 bg-purple-900/80">
      <SidebarHeader className="border-b border-purple-200/20 p-6 bg-purple-900/80">
        <div className="flex items-center space-x-3">
          <div className="h-12 w-12 flex items-center justify-center">
            <img
              src="/main-logo-black.png"
              alt="SmartFinanceAI"
              style={{
                width: 48,
                height: 48,
                objectFit: "cover",
                borderRadius: 12,
                display: "block",
              }}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">SmartFinanceAI</span>
            <span className="text-xs text-white/80 font-medium">FINANCIAL OS</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-purple-900/80">
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/80 font-medium">Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="text-white hover:text-white hover:bg-purple-500/50 data-[active=true]:bg-purple-500/70 data-[active=true]:text-white">
                    <a href={item.url} className="flex items-center gap-3 px-3 py-2 rounded-lg">
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
          <SidebarGroupLabel className="text-white/80 font-medium">Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="text-white hover:text-white hover:bg-purple-500/50">
                    <a href={item.url} className="flex items-center gap-3 px-3 py-2 rounded-lg">
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
                    className="text-red-200 hover:text-red-100 hover:bg-red-500/20 flex items-center gap-3 px-3 py-2 rounded-lg"
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

      <SidebarFooter className="border-t border-purple-200/20 bg-purple-900/80">
        <div className="p-4 space-y-2">
          {user && (
            <div className="flex items-center space-x-2 text-white/80 text-sm">
              <User className="w-4 h-4" />
              <span>{user.email?.split('@')[0] || 'User'}</span>
            </div>
          )}
          <div className="text-white/60 text-xs">
            Version {appVersion}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const CustomTrigger = () => {
    const { toggleSidebar } = useSidebar();
    
    return (
      <Button
        onClick={toggleSidebar}
        size="sm"
        className="bg-purple-500/20 hover:bg-purple-500/30 text-white border-purple-300/20 backdrop-blur-sm h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center p-0"
      >
        <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>
    );
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full max-w-full overflow-x-hidden">
        <AppSidebar />
        <main className="flex-1 relative bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 w-full max-w-full overflow-x-hidden">
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-50">
            <CustomTrigger />
          </div>
          <div className="pt-12 sm:pt-16 w-full max-w-full">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

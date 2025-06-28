
import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { AppSidebarHeader } from './sidebar/SidebarHeader';
import { AppSidebarFooter } from './sidebar/SidebarFooter';
import { NavigationSection } from './sidebar/NavigationSection';
import { AccountSection } from './sidebar/AccountSection';
import { SupportSection } from './sidebar/SupportSection';
import { useSidebarHandlers } from './sidebar/useSidebarHandlers';

export const AppSidebar = () => {
  const { handleSectionClick, handleSignOut } = useSidebarHandlers();

  return (
    <Sidebar className="w-64 max-w-64 border-r border-purple-700/30 bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 sticky top-0 h-screen">
      <AppSidebarHeader />

      <SidebarContent className="bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 overflow-y-auto">
        <NavigationSection onSectionClick={handleSectionClick} />
        
        <SidebarSeparator className="bg-purple-700/50" />
        
        <AccountSection onSectionClick={handleSectionClick} />
        
        <SidebarSeparator className="bg-purple-700/50" />
        
        <SupportSection onSignOut={handleSignOut} />
      </SidebarContent>

      <AppSidebarFooter />
    </Sidebar>
  );
};

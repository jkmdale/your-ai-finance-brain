
import React from 'react';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { menuItems } from './navigationData';

interface NavigationSectionProps {
  onSectionClick: (url: string) => void;
}

export const NavigationSection = ({ onSectionClick }: NavigationSectionProps) => {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-purple-200">Navigation</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {menuItems.map((item) => {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  onClick={() => onSectionClick(item.url)}
                  className="w-full text-purple-200 hover:text-purple-100 hover:bg-purple-700/30 data-[active=true]:bg-purple-600/40 cursor-pointer transition-colors duration-200"
                >
                  {item.icon === 'ai-icon' ? (
                    <img src="/icon_96x96.png" alt="AI Insights" className="w-4 h-4 object-contain" />
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
  );
};

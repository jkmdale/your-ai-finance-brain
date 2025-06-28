
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { accountItems } from './navigationData';

interface AccountSectionProps {
  onSectionClick: (url: string) => void;
}

export const AccountSection = ({ onSectionClick }: AccountSectionProps) => {
  const { setOpenMobile, isMobile } = useSidebar();
  const location = useLocation();

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-purple-200">Account</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {accountItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = item.isRoute && location.pathname === item.url;
            return (
              <SidebarMenuItem key={item.title}>
                {item.isRoute ? (
                  <SidebarMenuButton
                    asChild
                    className={`w-full text-purple-200 hover:text-purple-100 hover:bg-purple-700/30 cursor-pointer transition-colors duration-200 ${
                      isActive ? 'bg-purple-600/40 text-purple-100' : ''
                    }`}
                  >
                    <Link to={item.url} onClick={() => { if (isMobile) setOpenMobile(false); }}>
                      <IconComponent className="w-4 h-4 text-purple-200" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton
                    onClick={() => onSectionClick(item.url)}
                    className="w-full text-purple-200 hover:text-purple-100 hover:bg-purple-700/30 cursor-pointer transition-colors duration-200"
                  >
                    <IconComponent className="w-4 h-4 text-purple-200" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

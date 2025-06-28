
import React from 'react';
import { HelpCircle, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';

interface SupportSectionProps {
  onSignOut: () => Promise<void>;
}

export const SupportSection = ({ onSignOut }: SupportSectionProps) => {
  const { user } = useAuth();
  const { setOpenMobile, isMobile } = useSidebar();
  const location = useLocation();

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className={`w-full text-purple-200 hover:text-purple-100 hover:bg-purple-700/30 cursor-pointer transition-colors duration-200 ${
                location.pathname === '/help' ? 'bg-purple-600/40 text-purple-100' : ''
              }`}
            >
              <Link to="/help" onClick={() => { if (isMobile) setOpenMobile(false); }}>
                <HelpCircle className="w-4 h-4 text-purple-200" />
                <span>Help & Support</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {user && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={onSignOut}
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
  );
};


import React from 'react';
import { User } from 'lucide-react';
import { SidebarFooter } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';

export const AppSidebarFooter = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
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
  );
};


import React from 'react';
import { SidebarFooter } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';

export const AppSidebarFooter = () => {
  const { user } = useAuth();

  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.user_metadata?.name) {
      return user.user_metadata.name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  return (
    <SidebarFooter className="border-t border-purple-700/30 p-4 bg-gradient-to-r from-purple-900 via-purple-800 to-purple-900">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">
            {getUserDisplayName().charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <div className="text-purple-100 font-medium text-sm">{getUserDisplayName()}</div>
          <div className="text-purple-200 text-xs">Premium Member</div>
        </div>
      </div>
    </SidebarFooter>
  );
};

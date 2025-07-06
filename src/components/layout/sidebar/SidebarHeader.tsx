
import React from 'react';
import { SidebarHeader } from '@/components/ui/sidebar';

export const AppSidebarHeader = () => {
  return (
    <SidebarHeader className="border-b border-purple-200/20 p-6 bg-purple-900/80 sticky top-0 z-10">
      <div className="flex items-center space-x-3">
        <div className="h-12 w-12 flex items-center justify-center">
          <img
            src="/main-logo-black.png"
            alt="SmartFinanceAI"
            style={{
              width: 48,
              height: 48,
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>
        <div>
          <h2 className="text-purple-100 font-bold text-sm">SmartFinanceAI</h2>
          <p className="text-purple-200 text-xs">Financial OS</p>
        </div>
      </div>
    </SidebarHeader>
  );
};
